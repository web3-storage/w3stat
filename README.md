# w3stat

Admin tool to get info about a cid

```shell
❯ ./cli.js bafybeigfpa7cugx7acsz4omli2yezj6us4xgdrgmducsjuluva7oifemtq
bafybeigfpa7cugx7acsz4omli2yezj6us4xgdrgmducsjuluva7oifemtq
🟢 ok. cid not on denylist
🚘 bagbaieraxlxzbs4wpoiba7zzzgo4a3zjzx5asfdrex5jholcwkwmwiu77lwa
ℹ️  {"blockmultihash":"zQmbdVNNoE96XxAoaePk1zuqhDcCq86CWh6uY7Zcvrxnxv7","offset":588,"length":58,"carpath":"us-west-2/carpark-prod-0/bagbaieraxlxzbs4wpoiba7zzzgo4a3zjzx5asfdrex5jholcwkwmwiu77lwa/bagbaieraxlxzbs4wpoiba7zzzgo4a3zjzx5asfdrex5jholcwkwmwiu77lwa.car"}
```

## Getting started

- Clone the repo
- Install the deps `npm i`
- Find what we know about a CID `./cli.js [your cid here]`

## Environment

You need the following set in the environment

- [AWS credentials set up](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
- `R2_ACCESS_KEY_ID` - Cloudflare s3 api key id
- `R2_SECRET_ACCESS_KEY` - Cloudflare secret key
