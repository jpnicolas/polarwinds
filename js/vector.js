var Vector = function(x, y, lon, lat) {
  this.x = x;
  this.y = y;
  this.lon = lon;
  this.lat = lat;
}

var Coord = function(lon, lat) {
  this.lon = lon;
  this.lat = lat;
}

Vector.prototype.length = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vector.prototype.setLength = function(length) {
  var current = this.length();
  if (current) {
    var scale = length / current;
    this.x *= scale;
    this.y *= scale;
  }
  return this;
};

var VectorField = function(field, maxLength) {
  this.field = field;
  this.w = field.length;
  this.h = field[0].length;
  this.maxLength = maxLength;
};

VectorField.read = function(data) {
  var w = data.gridWidth;
  var h = data.gridHeight;
  var maxLength = data.maxSpeed
  var field = [];
  var i = 0;
  for (var x = 0; x < w; x++) {
    field[x] = [];
    for (var y = 0; y < h; y++) {
      var vx = 0.01 * data.v10[i];
      var vy = 0.01 * data.u10[i];
      var v = new Vector(vx, vy, data.lon[i], data.lat[i]);
      field[x][y] = v;
      i++;
    }
  }
  var result = new VectorField(field, maxLength);
  return result;
};

// CHANGE THIS !!!
VectorField.prototype.inBounds = function(x, y) {
  return x >= 0 && x <= (this.w - 1) && y >= 0 && y <= (this.h - 1);
};

VectorField.prototype.bilinear = function(name, a, b) {
  var na = Math.floor(a);
  var nb = Math.floor(b);
  var ma = Math.ceil(a);
  var mb = Math.ceil(b);
  var fa = a - na;
  var fb = b - nb;
  return this.field[na][nb][name] * (1 - fa) * (1 - fb) +
         this.field[ma][nb][name] * fa * (1 - fb) +
         this.field[na][mb][name] * (1 - fa) * fb +
         this.field[ma][mb][name] * fa * fb;
};

VectorField.prototype.bilinearCyclic = function(name, a, b, callingFrom) {
  var na = Math.floor(a);
  var nb = Math.floor(b);
  var ma = Math.ceil(a);
  var mb = Math.ceil(b);
  var fa = a - na;
  var fb = b - nb;

  var pts = [this.field[na][nb][name], this.field[ma][nb][name],
             this.field[na][mb][name], this.field[ma][mb][name]];

  if (Math.min.apply(Math, pts) < -90 && Math.max.apply(Math, pts) > 90) {
    for (var i in pts) {
      if (pts[i] < 0) {
        pts[i] += 360;
      }
    }
  }

  var res =  pts[0] * (1 - fa) * (1 - fb) +
         pts[1] * fa * (1 - fb) +
         pts[2] * (1 - fa) * fb +
         pts[3] * fa * fb;

  return res;
};

VectorField.prototype.getValue = function(x, y, opt_result) {
  var vx = this.bilinear('x', x, y);
  var vy = this.bilinear('y', x, y);
  if (opt_result) {
    opt_result.x = vx;
    opt_result.y = vy;
    return opt_result;
  }
  return new Vector(vx, vy);
};

VectorField.prototype.xy2lonlat = function(x, y, callingFrom) {
  // console.log(x,y,callingFrom);
  var lon = this.bilinearCyclic('lon', x, y, callingFrom);
  var lat = this.bilinear('lat', x, y);
  return new Coord(lon, lat);
};
