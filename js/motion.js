/**
 * Listens to mouse events on an element, tracks zooming and panning,
 * informs other components of what's going on.
 */
var Animator = function(element) {
  this.element = element;
  this.animating = true;
  this.state = 'animate';
  this.listeners = [];
  this.dx = 0;
  this.dy = 0;
  this.scale = 1;

  if (element) {
    var self = this;
    $(element).mousedown(function(e){
      self.mouseX = e.pageX - this.offsetLeft;
      self.mouseY = e.pageY - this.offsetTop;
      self.mousedown();
    });
    $(element).mouseup(function(e){
      self.mouseX = e.pageX - this.offsetLeft;
      self.mouseY = e.pageY - this.offsetTop;
      self.mouseup();
    });
    $(element).mousemove(function(e){
      self.mouseX = e.pageX - this.offsetLeft;
      self.mouseY = e.pageY - this.offsetTop;
      self.mousemove();
    });
  }
};

Animator.prototype.mousedown = function() {
  this.state = 'mouse-down';
  this.notify('startMove');
  this.landingX = this.mouseX;
  this.landingY = this.mouseY;
  this.dxStart = this.dx;
  this.dyStart = this.dy;
  this.scaleStart = this.scale;
  this.mouseIsDown = true;
};

Animator.prototype.mousemove = function() {
  if (!this.mouseIsDown) {
    this.notify('hover');
    return;
  }
  var ddx = this.mouseX - this.landingX;
  var ddy = this.mouseY - this.landingY;
  var slip = Math.abs(ddx) + Math.abs(ddy);
  if (slip > 2 || this.state == 'pan') {
    this.state = 'pan';
    this.dx += ddx;
    this.dy += ddy;
    this.landingX = this.mouseX;
    this.landingY = this.mouseY;
    this.notify('move');
  }
}

Animator.prototype.mouseup = function() {
  this.mouseIsDown = false;
  if (this.state == 'pan') {
    this.state = 'animate';
    this.notify('endMove');
    return;
  }
  this.zoomClick(this.mouseX, this.mouseY);
};

Animator.prototype.add = function(listener) {
  this.listeners.push(listener);
};

Animator.prototype.notify = function(message) {
  for (var i = 0; i < this.listeners.length; i++) {
    var listener = this.listeners[i];
    if (listener[message]) {
      listener[message].call(listener, this);
    }
  }
};

Animator.prototype.start = function(opt_millis) {
  var millis = opt_millis || 20;
  var self = this;
  function go() {
    var start = new Date();
    self.loop();
    var time = new Date() - start;
    setTimeout(go, Math.max(10, millis - time));
  }
  go();
};

Animator.prototype.loop = function() {
  if (this.state == 'mouse-down' || this.state == 'pan') {
    return;
  }
  if (this.state == 'animate') {
    this.notify('animate');
    return;
  }
  if (this.state == 'zoom') {
    this.zoomProgress = Math.min(1, this.zoomProgress + .07);
    var u = (1 + Math.cos(Math.PI * this.zoomProgress)) / 2;
    function lerp(a, b) {
      return u * a + (1 - u) * b;
    }
    this.scale = lerp(this.scaleStart, this.scaleTarget);
    this.dx = lerp(this.dxStart, this.dxTarget);
    this.dy = lerp(this.dyStart, this.dyTarget);
    if (this.zoomProgress < 1) {
      this.notify('move');
    } else {
      this.state = 'animate';
      this.zoomCurrent = this.zoomTarget;
      this.notify('endMove');
    }
  }
};

var Particle = function(x, y, age) {
  this.x = x;
  this.y = y;
  this.lon = 0.;
  this.lat = 0.;
  this.oldLon = -1;
  this.oldLat = -1;
  this.oldX = -1;
  this.oldY = -1;
  this.oldI = -1;
  this.oldJ = -1;
  this.age = age;
  this.rnd = Math.random();
}

var MotionDisplay = function(canvas, field, numParticles, opt_projection) {
  this.canvas = canvas;
  this.projection = opt_projection;
  this.field = field;
  this.numParticles = numParticles;
  this.first = true;
  this.maxLength = field.maxLength;
  this.speedScale = 10;
  this.x0 = 0;
  this.x1 = this.field.w - 1;
  this.y0 = 0;
  this.y1 = this.field.h - 1;
  this.makeNewParticles(null, true);
  this.colors = [];
  this.rgb = '40, 40, 40';
  this.background = 'rgb(' + this.rgb + ')';
  this.backgroundAlpha = 'rgba(' + this.rgb + ', .02)';
  this.outsideColor = '#fff';
  for (var i = 0; i < 256; i++) {
    this.colors[i] = 'rgb(' + i + ',' + i + ',' + i + ')';
  }
};

MotionDisplay.prototype.project = function(lon, lat) {
  var proj = this.projection([lon, lat]);
  return new Vector(proj[0], proj[1]);
}

MotionDisplay.prototype.invert = function(x, y) {
  var inv = this.projection.invert([x, y]);
  return new Vector(inv[0], inv[1]);
}

MotionDisplay.prototype.setAlpha = function(alpha) {
  this.backgroundAlpha = 'rgba(' + this.rgb + ', ' + alpha + ')';
};

MotionDisplay.prototype.makeNewParticles = function(animator) {
  // console.log('Creating '+this.numParticles+' particles');
  this.particles = [];
  for (var i = 0; i < this.numParticles; i++) {
    // console.log('particle ' + i);
    this.particles.push(this.makeParticle(animator));
  }
};

MotionDisplay.prototype.makeParticle = function(animator) {
  var dx = animator ? animator.dx : 0;
  var dy = animator ? animator.dy : 0;
  var scale = animator ? animator.scale : 1;
  var safecount = 0;
  for (;;) {
    var x = Math.random() * this.x1;
    var y = Math.random() * this.y1;
    var v = this.field.getValue(x, y);
    var coord = this.field.xy2lonlat(x, y, 'makeParticle');
    if (this.field.maxLength == 0) {
      return new Particle(x, y, 1 + 40 * Math.random());
    }
    var m = v.length() / this.field.maxLength;
    // The random factor here is designed to ensure that
    // more particles are placed in slower areas; this makes the
    // overall distribution appear more even.
    if ((v.x || v.y) && (++safecount > 10 || Math.random() > m * .9)) {
      var proj = this.project(coord.lon, coord.lat);
      var sx = proj.x * scale + dx;
      var sy = proj.y * scale + dy;
      if (++safecount > 10 || !(sx < 0 || sy < 0 || sx > this.canvas.width || sy > this.canvas.height)) {
        return new Particle(x, y, 1 + 40 * Math.random());
      }
    }
  }
};

MotionDisplay.prototype.animate = function(animator) {
  this.moveThings(animator);
  this.draw(animator);
}

MotionDisplay.prototype.moveThings = function(animator) {
  var speed = .01 * this.speedScale / animator.scale;
  for (var i = 0; i < this.particles.length; i++) {
    var p = this.particles[i];
    if (p.age > 0 && this.field.inBounds(p.x, p.y)) {
      var a = this.field.getValue(p.x, p.y);
      p.oldI = p.x;
      p.oldJ = p.y;
      p.x += speed * a.x;
      p.y += speed * a.y;
      p.age--;
    } else {
      this.particles[i] = this.makeParticle(animator);
    }
  }
};

MotionDisplay.prototype.draw = function(animator) {
  var context = this.canvas.getContext('2d');
  var w = this.canvas.width;
  var h = this.canvas.height;
  if (this.first) {
    context.fillStyle =  this.background;
    this.first = false;
  } else {
    context.fillStyle = this.backgroundAlpha;
  }
  var dx = animator.dx;
  var dy = animator.dy;
  var scale = animator.scale;

  context.fillRect(dx, dy, w * scale,h * scale);

  context.lineWidth = .75;
  for (var i = 0; i < this.particles.length; i++) {
    var p = this.particles[i];
    if (!this.field.inBounds(p.x, p.y)) {
      p.age = -2;
      continue;
    }
    var coord = this.field.xy2lonlat(p.x, p.y,'draw');
    var proj = this.project(coord.lon, coord.lat);
    p.lon = coord.lon;
    p.lat = coord.lat;
    proj.x = proj.x * scale + dx;
    proj.y = proj.y * scale + dy;
    if (proj.x < 0 || proj.y < 0 || proj.x > w || proj.y > h) {
      p.age = -2;
    }
    if (p.oldX != -1) {
      var wind = this.field.getValue(p.x, p.y);
      var s = wind.length() / this.maxLength;
      var c = 90 + Math.round(600 * s); // was 400
      if (c > 255) {
        c = 255;
      }
      context.strokeStyle = this.colors[c];
      context.beginPath();
      context.moveTo(proj.x, proj.y);
      context.lineTo(p.oldX, p.oldY);
      context.stroke();
    }
    p.oldLon = coord.lon;
    p.oldLat = coord.lat;
    p.oldX = proj.x;
    p.oldY = proj.y;
  }
};
