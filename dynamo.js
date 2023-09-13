import { base58btc } from 'multiformats/bases/base58'
import { QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { CID } from 'multiformats/cid'

/**
 * Convert a CID to a multihash with base58btc multibase prefix (z)
 * @param {string} cidStr
 */
export function base58btcMultihash (cidStr) {
  const cid = CID.parse(cidStr)
  return base58btc.encode(cid.multihash.bytes)
}

/**
 * @param {string} cidStr
 * @param {import('@aws-sdk/client-dynamodb').DynamoDBClient} dynamo
 */
export async function findIndexesByCid (cidStr, dynamo, table = 'prod-ep-v1-blocks-cars-position') {
  const hash = base58btcMultihash(cidStr)
  const cmd = new QueryCommand({
    TableName: table,
    KeyConditionExpression: 'blockmultihash = :hash',
    ExpressionAttributeValues: { ':hash': { S: hash } }
  })
  const res = await dynamo.send(cmd)
  const items = res.Items ?? []
  return items.map(i => unmarshall(i))
}

/**
 * @template I
 * @extends {TransformStream<I, I[]>}
 */
export class Batcher extends TransformStream {
  /**
   * @param {number} size
   */
  constructor (size) {
    /** @type {I[]} */
    let batch = []
    super({
      transform (chunk, controller) {
        batch.push(chunk)
        if (batch.length < size) return
        controller.enqueue(batch)
        batch = []
      },
      flush (controller) {
        if (batch.length) controller.enqueue(batch)
        batch = []
      }
    })
  }
}
