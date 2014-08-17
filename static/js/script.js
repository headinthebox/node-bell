var init = function(names, apiPrefix) {
  // cubism context
  var context = cubism.context()
  .serverDelay(0)
  .clientDelay(0)
  .step(1e4)
  .size(1080);  // 360 * 3 = 3 hours

  // metric source
  function pull(name) {
    return context.metric(function(start, stop, step, callback){
      start = +start/1000, stop = +stop/1000, step = +step/1000;

      var api = apiPrefix + '/' + [name, start, stop].join('/');
      var values = [], i = 0;

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
      }
    }, name);
  }

  // create series
  var d = [];
  for (var i = 0; i < names.length; i++) {d.push(pull(names[i]))};

  // plot chart
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
      .colors(["black", "black", "black", "black",
              "lightgray", "gray", "#ffb6ad", "#ea3c0b"])
     );

    div.append("div")
    .attr("class", "rule")
    .call(context.rule());
  });
}
