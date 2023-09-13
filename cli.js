#!/usr/bin/env node

import sade from 'sade'
import fs from 'node:fs'
import process from 'node:process'
import * as readline from 'node:readline/promises'
import { Parallel } from 'parallel-transform-web'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'
import { checkDenyList } from './deny.js'
import { dudewhere } from './dudewhere.js'
import { findIndexesByCid, base58btcMultihash } from './dynamo.js'

const concurrency = 50

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), { encoding: 'utf-8' }))

const cli = sade('w3stat')

cli
  .version(pkg.version)
  .example('dudewhere [cid]')

cli.command('cid [cid]', 'find out what we know about that cid', { default: true })
  .option('--json', 'format output as json')
  .action(async (cidStr, opts) => {
    const s3 = new S3Client({
      region: 'auto',
      endpoint: 'https://fffa4b4363a7e5250af8357087263b3a.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY')
      }
    })
    const dynamo = new DynamoDBClient({})
    inputStream(cidStr, opts._)
      .pipeThrough(new Parallel(concurrency, async cidStr => {
        const [dude, indexes, deny] = await Promise.all([
          dudewhere(cidStr, s3),
          findIndexesByCid(cidStr, dynamo, opts.table),
          checkDenyList(cidStr)
        ])
        return { cid: cidStr, dude, indexes, deny }
      }))
      .pipeTo(new WritableStream({
        write ({ cid, dude, indexes, deny }) {
          if (opts.json) {
            console.log(JSON.stringify({ cid, dudewhere: dude, dynamo: indexes, deny }))
          } else {
            const mh = base58btcMultihash(cid)
            const cars = dude.length === 0 ? '🚘 missing dudewhere mapping' : dude.map(str => `🚘 ${str.split('/').at(1)}`).join('\n')
            const idx = indexes.length === 0 ? `ℹ️ no block index in dynamo for ${mh}` : indexes.map(idx => `ℹ️  ${JSON.stringify(idx)}`).join('\n')
            const denylist = deny.onDenyList ? '❌ blocked. cid found on denylist' : '🟢 ok. cid not on denylist'
            console.log(`${cid}\n${denylist}\n${cars}\n${idx}`)
          }
        }
      }))
  })

cli.command('denylist [cid]', 'check if cid is on the w3s denylist')
  .action(async (cidStr, opts) => {
    inputStream(cidStr, opts._)
      .pipeThrough(new Parallel(concurrency, async cidStr => {
        return checkDenyList(cidStr)
      }))
      .pipeTo(new WritableStream({
        write (obj) {
          console.log(JSON.stringify(obj))
        }
      }))
  })

cli.command('dudewhere [cid]', 'check the dudewhere map from root cid to car cid')
  .option('-b, --bucket', 'bucket name', 'dudewhere-prod-0')
  .action(async (cidStr, opts) => {
    const s3 = new S3Client({
      region: 'auto',
      endpoint: 'https://fffa4b4363a7e5250af8357087263b3a.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY')
      }
    })
    inputStream(cidStr, opts._)
      .pipeThrough(new Parallel(concurrency, async cid => {
        const res = await dudewhere(cid, s3, opts.bucket)
        return { cid, res }
      }))
      .pipeTo(new WritableStream({
        write (obj) {
          console.log(JSON.stringify(obj))
        }
      }))
  })

cli.command('dynamo [cid]', 'check a cid is in dynamodb index')
  .option('--table', 'table name', 'prod-ep-v1-blocks-cars-position')
  .action(async (cidStr, opts) => {
    const dynamo = new DynamoDBClient({})
    inputStream(cidStr, opts._)
      .pipeThrough(new TransformStream({
        transform: async (cidStr, controller) => {
          const items = await findIndexesByCid(cidStr, dynamo, opts.table)
          controller.enqueue(items)
        }
      }))
      .pipeTo(new WritableStream({
        write (obj) {
          console.log(JSON.stringify(obj))
        }
      }))
  })

cli.command('mh [cid]', 'convert a cid to a multihash with base58btc multibase prefix')
  .action((cidStr, opts) => {
    inputStream(cidStr, opts)
      .pipeTo(new WritableStream({
        write (cidStr) {
          console.log(base58btcMultihash(cidStr))
        }
      }))
  })

cli.parse(process.argv)

/**
 * @param {Record<string, string|undefined>} obj
 * @param {string} key
 */
function notNully (obj, key, msg = 'unexpected null value') {
  const value = obj[key]
  if (!value) throw new Error(`${msg}: ${key}`)
  return value
}

/**
 * @param {string} key
 */
function env (key) {
  return notNully(process.env, key, `${key} must be set in ENV`)
}

/**
 * ReadableStream from params or stdin
 *
 * @param {string} first
 * @param {string[]} rest
 */
function inputStream (first, rest = []) {
  /** @type {ReadableStream<string>} */
  const source = new ReadableStream({
    async start (controller) {
      // input param passed
      if (first) {
        controller.enqueue(first)
        // maybe more then one
        for (const item of rest) {
          controller.enqueue(item)
        }
        return
      }
      // note: "having asynchronous operations between interface creation and asynchronous iteration may result in missed lines."
      // https://nodejs.org/docs/latest-v18.x/api/readline.html#rlsymbolasynciterator
      const rl = readline.createInterface({ input: process.stdin })
      for await (const line of rl) {
        controller.enqueue(line)
      }
      rl.close()
    }
  })

  return source
}
