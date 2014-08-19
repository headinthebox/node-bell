function init(pattern, limit, apiPrefix) {
  /*
   * cubism context
   */
  var context = cubism.context()
  .serverDelay(0)
  .clientDelay(0)
  .step(1e4)  // 10sec
  .size(1080)  // 3h
  ;

  /*
   * metrics source
   */
  function pullMetrics(name) {
    return context.metric(function(start, stop, step, callback){
      // cast to timestamp
      start = +start/1000, stop = +stop/1000, step = +step/1000;
      // api url to fetch metrics
      var api = apiPrefix + '/' + ['metrics', name, start, stop].join('/');
      var values = [], i = 0;
      // send request
      var xmlhttp=new XMLHttpRequest();
      xmlhttp.open("GET", api, true);
      xmlhttp.send();
      xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
          var data = JSON.parse(xmlhttp.responseText);

          while (start < stop) {
            while (start < data.times[i]) {
              start += step;
              values.push(0);
            }
            values.push(data.vals[i++]);
            start += step;
          }
          callback(null, values);
        }
      };
    }, name);
  }

  /*
   * names source
   */
  function pullNames(callback) {
    var api = apiPrefix + '/' + ['names', pattern, limit].join('/');
    var xmlhttp=new XMLHttpRequest();
    xmlhttp.open("GET", api, true);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        var names = JSON.parse(xmlhttp.responseText);
        callback(names);
      }
    };
  }

  /*
   * plot graph
   */

  function plot() {
    pullNames(function(names){
      var d = [];
      for (var i = 0; i < names.length; i++) {d.push(pullMetrics(names[i]))};

      d3.select("#chart").call(function(div) {

        div.append("div")
        .attr("class", "axis")
        .call(context.axis().orient("top"));

        div.selectAll(".horizon")
        .data(d)
        .enter().append("div")
        .attr("class", "horizon")
        .call(
          context.horizon()
          .extent([0, 2])
          .colors(['black', 'black', 'teal', '#dd1144'])
        );

        div.append("div")
        .attr("class", "rule")
        .call(context.rule());
      });
    });
  }

  plot();

  setInterval(function(){
    d3.select("#chart").selectAll("*").remove();
    plot();
  }, 5 * 60 * 1000);  // replot every 5 min
}
