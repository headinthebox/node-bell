Bell
====

Realtime anomalies detection based on statsd,
for periodic time series.

![](https://github.com/eleme/node-bell/raw/master/snap.png)


Latest version: v0.0.9

Requirements
------------

- [node.js](http://nodejs.org/) 0.11.x
- [ssdb](https://github.com/ideawu/ssdb) 1.6.8.8+
- [beanstalkd](https://github.com/kr/beanstalkd)
- [statsd](https://github.com/etsy/statsd)

Installation
------------

Install statsd backend [statsd-bell](https://github.com/eleme/statsd-bell):

```bash
$ npm install statsd-bell
```

then add `statsd-bell` to statsd's backends in statsd's config.js:

```js
{
, backends: ["statsd-bell"]
}
```

next, install `node-bell`:

```bash
$ npm install node-bell -g
```

Quick Start
-----------

1. Start statsd & ssdb & beanstalkd.
2. Generate sample configuration and edit it, default [res/configs.toml](res/configs.toml):

   ```bash
   $ bell -s
   $ mv sample.configs.toml configs.toml
   $ vi configs.toml
   ```
3. Start listener & analyzers (optional: webapp).

   ```bash
   bell analyzer -c configs.toml
   bell listener -c configs.toml
   bell webapp -c configs.toml
   ```

   You can view site on 0.0.0.0:8989.

Services
--------

1. **listener**: receives incoming metrics from statsd, then put them to job queue.
2. **analyzer(s)**: get job from job queue, and then analyze if current metric an anomaly or not.
3. **webapp**: visualizes analyzation result on web.

Events & Hooks
--------------

Hook modules are Node.js modules that listen for events from node-bell.
Each hook module shoule export the following initialization function:

- `init(configs, analyzer, log)`

Events currently available:

- Event **'anomaly detected'**

   Parameters: `(metric, multiples)`

   Emitted when an anomaly was detected.

Built-in hook module (and sample hook): [hooks](hooks).

Look Inside
-----------

### Algorithm

**3-sigma** or called **68-95-99.7** rule, [reference](http://en.wikipedia.org/wiki/68%E2%80%9395%E2%80%9399.7_rule)

![](http://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Standard_deviation_diagram.svg/350px-Standard_deviation_diagram.svg.png)

### Storage

Analyzers store metrics in ssdb, using zset, here is storage format for a single time series:

```
key       |  score
--------------------------------------
timestamp | value:is_anomaly:timestamp
```

### Data Flow


```
 [statsd]
    |
    v        send to queue
[listener] -----------------> [beanstalkd]
                                  |
                                  | reserve
            history metrics       v       record anomalies
            ---------------> [analyzers] ----------------
            |                     |                     |
            |                     | put to ssdb         |
            |                     v                     |
            ------------------- [ssdb] <-----------------
                                  |
                                  |
                                  v
                               [webapp]
```

License
--------

MIT.
