Node-bell FAQ
=============

How to run webapp with multiple workers
----------------------------------------

For example, using [cluster-master](https://github.com/isaacs/cluster-master),
touch a file, i.e `webapp-master.js`:

```js
var clusterMaster = require('cluster-master');

clusterMaster({
  exec: '/usr/bin/bell',  // bell bin path
  size: 5,  // workers count
  args: ['webapp', '-c', './configs.toml', '-l', '5']
})
```

and then run it:

```bash
$ node --harmony-generators webapp-master.js
```

"Too many open files" in my ssdb log
------------------------------------

You need to set your linux's `max open files` to at least 10k, 
see [how to](http://stackoverflow.com/questions/34588/how-do-i-change-the-number-of-open-files-limit-in-linux).
