import { CID } from 'multiformats/cid'
import { fetch } from 'undici'

/**
 * @param {string} cidStr
 */
export async function checkDenyList (cidStr) {
  const cid = CID.parse(cidStr)
  const key = cid.toV1().toString()
  const url = new URL(key, 'https://denylist.dag.haus')
  const res = await fetch(url, { method: 'GET' })
  if (res.ok) {
    return { onDenyList: true, cid: cidStr, url }
  }
  if (res.status === 404) {
    return { onDenyList: false, cid: cidStr, url }
  }
  throw new Error(`Expected 200 or 404 from denylist, got ${res.status} ${await res.text()} ${url}`)
}
