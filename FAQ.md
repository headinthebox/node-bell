Node-bell FAQ
=============

How to run webapp with multiple workers
----------------------------------------

For example, using [cluster-master](https://github.com/isaacs/cluster-master),
touch a file, i.e `webapp-master.js`:

```js
var clusterMaster = require('cluster-master');

clusterMaster({
  exec: '/usr/bin/bell',
  size: 5,
  args: ['webapp', '-c', './configs.toml', '-l', '5']
})
```

and then run it:

```bash
$ node --harmony-generators webapp-master.js
```
