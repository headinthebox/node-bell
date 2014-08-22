(function() {
  var ctx = cubism.context();
  ctx.serverDelay(0).clientDelay(0).step(1e4).size(1080);

  var pattern, limit, apiPrefix;

  // exports for configuration
  this.bell = function(p, l, a) {
    pattern = p, limit = l, apiPrefix = a;

    drawPlot();

    setInterval(function(){
      d3.select("#chart").selectAll("*").remove();
      drawPlot();
    }, 5 * 60 * 1000);
  };

  function request(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        var type = xhr.status / 100 | 0;
        if (type === 2) {
          var data = JSON.parse(xhr.responseText);
          return cb(null, data);
        }
        var err = new Error(xhr.statusText + ': ' + xhr.response);
        err.status = xhr.status;
        fn(err);
      }
    };
    xhr.send();
  }

  function drawChart(data) {
    var colors = ['black', 'black', '#bae4b3', '#dd1144'];

    var horizon = ctx.horizon();
    // horizon.colors(colors);
    horizon.extent([0, 2]);

    setTimeout(function() {
      horizon.extent([0, 4]);
    }, 2000);

    d3.select("#chart").call(function(div) {
      div.append("div").attr("class", "axis").call(ctx.axis().orient("top"));
      div.selectAll(".horizon")
        .data(data)
        .enter()
        .append("div")
        .attr("class", "horizon")
        .call(horizon);

      div.append("div")
        .attr("class", "rule")
        .call(ctx.rule());
    });
  }

  function createMetric(name) {
    return ctx.metric(function(start, stop, step, callback) {
      // cast to timestamp
      start = +start/1000, stop = +stop/1000, step = +step/1000;

      // api url to fetch metrics
      var url = apiPrefix + '/' + ['metrics', name, start, stop].join('/');

      request(url, function(err, data) {
        if (err) {
          return callback(err);
        }
        var values = [], i = 0;

        while (start < stop) {
          while (start < data.times[i]) {
            start += step;
            values.push(0);
          }
          var val = data.vals[i++];
          values.push(val);
          start += step;
        }

        callback(null, values);
      });
    }, name);
  }

  function drawPlot() {
    var url = apiPrefix + '/' + ['names', pattern, limit].join('/');
    request(url, function(err, names) {
      if (err) return;
      var data = names.map(createMetric);
      drawChart(data);
    });
  }

})(this);
