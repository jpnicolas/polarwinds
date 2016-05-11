function init() {

  var width = $(window).width();
  var height = $(window).height();

  var projection = d3.geo.stereographic()
      .scale(2000)
      .translate([width / 2, height / 2])
      .rotate([0, 92])
      .clipAngle(180 - 1e-4)
      .clipExtent([[0, 0], [width, height]]);

  var path = d3.geo.path().projection(projection);

  var graticule = d3.geo.graticule();

  var canvas = d3.select("#display").append("canvas")
      .attr("width", width)
      .attr("height", height)
      .node();

  var numParticles = 2000;
  var field = VectorField.read(windData);
  console.log(field);
  var display = new MotionDisplay(canvas, field, numParticles, projection);
  mapAnimator = new Animator();
  mapAnimator.add(display);
  mapAnimator.start(40);

  var context = d3.select("#display").append("canvas")
      .attr("width", width)
      .attr("height", height)
      .node().getContext('2d');

  d3.json("data/topo/topo_50m.json", function(error, world) {
    if (error) throw error;
    console.log(world)

    var ocean     = topojson.feature(world, world.objects.ocean_50m);
    var coastline = topojson.feature(world, world.objects.coastline_50m);
    var iceLines  = topojson.feature(world, world.objects.iceshelves_lines_50m);
    var icePolys  = topojson.feature(world, world.objects.iceshelves_polys_50m);

    path.context(context)(coastline);
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    path.context(context)(iceLines);
    context.stroke();
    context.beginPath();
    path(graticule());
    context.strokeStyle = '#555';
    context.lineWidth = 1;
    context.stroke();
  });

}
