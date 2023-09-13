import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { base32 } from 'multiformats/bases/base32'
import { CID } from 'multiformats/cid'

/**
 * Find dudewhere mapping info for a root cid
 *
 * @param {string} cidStr
 * @param {string} bucket
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} [prefixOverride]
 */
export async function dudewhere (cidStr, client, bucket = 'dudewhere-prod-0', prefixOverride) {
  const cid = CID.parse(cidStr)
  const prefix = prefixOverride ?? `${cid.toV1().toString(base32)}/`
  const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
  const res = await client.send(cmd)
  const items = res.Contents ?? []
  if (items.length === 0 && cid.version === 0 && !prefixOverride) {
    return dudewhere(cidStr, client, bucket, cid.toString())
  }
  return items.map(i => i.Key)
}
