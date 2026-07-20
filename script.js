(function() {
  var canvas = document.getElementById('canvas-wrap');
  var svgObj = document.getElementById('svg-object');
  var svg = null;
  
  function init() {
    svg = svgObj.contentDocument.querySelector('svg');
    if (!svg) { setTimeout(init, 100); return; }
    setup();
  }
  
  svgObj.addEventListener('load', init);
  
  function setup() {
  
  function qs(id) { return svg.querySelector('[id="' + id + '"]'); }
  
  var mechL = qs('svg-mech-l');
  var mechR = qs('svg-mech-r');
  var mechA = qs('svg-mech-a');
  var mechB = qs('svg-mech-b');
  var meches = qs('svg-meches');
  var monkey = qs('svg-monkey');
  var monkeyA = qs('svg-monkey-a');
  var monkeyB = qs('svg-monkey-b');
  var monkeyL = qs('svg-monkey-l');
  var monkeyR = qs('svg-monkey-r');
  var monkeyL1 = qs('svg-monkey-l1');
  var monkeyR1 = qs('svg-monkey-r1');
  var monkeyT = qs('svg-monkey-t');
  var monkeyH = qs('svg-monkey-h');
  var dotL = qs('svg-monkey-dot-left');
  var dotR = qs('svg-monkey-dot-right');
  var dotM = qs('svg-monkey-dot-middle');
  var dotT = qs('svg-monkey-dot-top');
  var dotBL = qs('svg-monkey-dot-btm-left');
  var dotBR = qs('svg-monkey-dot-btm-right');
  var mDotL = qs('svg-mech-dot-left');
  var mDotR = qs('svg-mech-dot-right');
  var mDotM = qs('svg-mech-dot-middle');
  var mDotT = qs('svg-mech-dot-top');
  var mDotBL = qs('svg-mech-dot-btm-left');
  var mDotBR = qs('svg-mech-dot-btm-right');
  var numbers = qs('svg-numbers');
  var numbersMult = qs('svg-numbers-multiply');
  var numbersAdd = qs('svg-numbers-add');
  var numbersDots = qs('svg-numbers-dots');
  
  var sliderLeft = document.getElementById('slider-left');
  var sliderRight = document.getElementById('slider-right');
  
  var markerPath = qs('svg-marker-path');
  var markerBBox = markerPath ? markerPath.getBBox() : { x: 0, y: 0, width: 770 };
  var markerX = markerBBox.x;
  var markerY = markerBBox.y;
  var totalWidth = markerBBox.width;
  var step = totalWidth / 12;
  
  var mechLBBox = mechL ? mechL.getBBox() : { width: 100 };
  var mechWidth = mechLBBox.width;
  var diagonal = Math.sqrt(2) * mechWidth;
  
  var snapPos = [];
  for (var i = 0; i < 13; i++) snapPos.push(i * step);
  
  var currentOp = 0;
  
  // Posicionar sliders no início do marcador
  sliderLeft.style.left = markerX + 'px';
  var sliderY = 863;
  sliderLeft.style.top = sliderY + 'px';
  sliderRight.style.left = markerX + 'px';
  sliderRight.style.top = sliderY + 'px';
  
  TweenMax.set(mechA, { transformOrigin: 'left bottom' });
  TweenMax.set(mechB, { transformOrigin: 'right bottom' });
  TweenMax.set(mechL, { transformOrigin: 'left bottom' });
  TweenMax.set(mechR, { transformOrigin: 'right bottom' });
  TweenMax.set(monkeyA, { transformOrigin: '32.256px 55.925px' });
  TweenMax.set(monkeyB, { transformOrigin: '328.244px 55.925px' });
  TweenMax.set(monkeyT, { transformOrigin: 'center bottom' });
  TweenMax.set(monkeyL, { transformOrigin: '72px 439px' });
  TweenMax.set(monkeyR, { transformOrigin: '392px 439px' });
  
  TweenMax.set(numbersDots, { opacity: 0 });
  TweenMax.set(meches, { opacity: 0 });
  TweenMax.set(numbersAdd, { opacity: 0 });
  TweenMax.set(numbersMult, { opacity: 1 });
  
  function doUpdate() {
    var l = sliderLeft._gsTransform ? sliderLeft._gsTransform.x : 0;
    var u = sliderRight._gsTransform ? sliderRight._gsTransform.x : totalWidth;
    var e = u - l, f = e / 4;
    var x = Math.sqrt(diagonal * diagonal - e * e / 4) / 2;
    var n = { x: 0, y: 2 * x }, o = { x: 0, y: 2 * f };
    var c = { x: 2 * f, y: 0 }, m = { x: x + f, y: x + f };
    var angle = Math.atan2(m.x - c.x, m.y - c.y) * (180 / Math.PI);
    
    TweenMax.set(meches, { x: l });
    TweenMax.set(mechL, { rotation: -angle });
    TweenMax.set(mechR, { rotation: angle, x: e - totalWidth });
    TweenMax.set(mechA, { rotation: angle, x: -(m.x - c.x), y: mechWidth - m.y });
    TweenMax.set(mechB, { rotation: -angle, x: e - totalWidth + (m.x - c.x), y: mechWidth - m.y });
    TweenMax.set(monkey, { x: l });
    TweenMax.set(monkeyL, { rotation: -angle });
    TweenMax.set(monkeyR, { rotation: angle, x: e - totalWidth });
    TweenMax.set(monkeyL1, { x: 0 });
    TweenMax.set(monkeyR1, { x: e });
    TweenMax.set(monkeyA, { rotation: angle, x: -(m.x - c.x), y: mechWidth - m.y });
    TweenMax.set(monkeyB, { rotation: -angle, x: e - totalWidth + (m.x - c.x), y: mechWidth - m.y });
    TweenMax.set(monkeyT, { x: e / 2, y: -o.y - 25 });
    TweenMax.set(monkeyH, { x: e / 2, y: -n.y });
    TweenMax.set([dotL, mDotL], { x: c.x - m.x, y: -m.y });
    TweenMax.set([dotR, mDotR], { x: e + m.x - c.x, y: -m.y });
    TweenMax.set([dotM, mDotM], { x: e / 2, y: -o.y });
    TweenMax.set([dotT, mDotT], { x: e / 2, y: -n.y });
    TweenMax.set([dotBL, mDotBL], { x: 0, y: 0 });
    TweenMax.set([dotBR, mDotBR], { x: e, y: 0 });
    
    var resetBtn = document.getElementById('btn-reset');
    if (resetBtn) resetBtn.disabled = (l < 0.01 && Math.abs(u - totalWidth) < 0.01);
  }
  
  function snap(val) {
    var nearest = snapPos[0], minDist = Math.abs(val - nearest);
    for (var i = 1; i < snapPos.length; i++) {
      var d = Math.abs(val - snapPos[i]);
      if (d < minDist) { minDist = d; nearest = snapPos[i]; }
    }
    return nearest;
  }
  
  var activeSlider = null, dragStartX = 0, dragStartVal = 0;
  
  function getPos(e) {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }
  
  function findSlider(px, py) {
    var all = document.querySelectorAll('.slider');
    var best = null, bestDist = 150;
    all.forEach(function(s) {
      var r = s.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var d = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
      if (d < bestDist) { bestDist = d; best = s; }
    });
    return best;
  }
  
  function onDown(e) {
    var pos = getPos(e);
    var s = findSlider(pos.x, pos.y);
    if (!s) return;
    e.preventDefault();
    activeSlider = s;
    dragStartX = pos.x;
    dragStartVal = (s._gsTransform ? s._gsTransform.x : 0);
  }
  
  function onMove(e) {
    if (!activeSlider) return;
    e.preventDefault();
    var pos = getPos(e);
    // Converter pixels da tela para coordenadas SVG
    var blocks = document.querySelector('[data-htmler-blocks]');
    var scale = blocks ? svg.clientWidth / 1050 : 1;
    var dx = (pos.x - dragStartX) / scale;
    var newX = Math.max(0, Math.min(totalWidth, dragStartVal + dx));
    
    // Travar para não passar do outro slider
    if (activeSlider === sliderLeft) {
      newX = Math.min(newX, sliderRight._gsTransform.x - step);
    } else {
      newX = Math.max(newX, sliderLeft._gsTransform.x + step);
    }
    
    TweenMax.set(activeSlider, { x: newX });
    doUpdate();
  }
  
  function onUp(e) {
    if (!activeSlider) return;
    if (e) e.preventDefault();
    var gs = activeSlider._gsTransform;
    var cur = gs ? gs.x : 0;
    var snapped = snap(cur);
    
    TweenMax.to(activeSlider, 0.15, { x: snapped, onUpdate: doUpdate });
    activeSlider = null;
  }
  
  document.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp, { passive: false });
  document.addEventListener('touchcancel', onUp, { passive: false });
  document.addEventListener('mousedown', onDown);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  
  document.getElementById('btn-op').addEventListener('click', function() {
    currentOp = currentOp === 0 ? 1 : 0;
    this.textContent = currentOp === 0 ? '×' : '+';
    TweenMax.to(numbersAdd, 0.25, { opacity: currentOp === 0 ? 0 : 1 });
    TweenMax.to(numbersMult, 0.25, { opacity: currentOp === 0 ? 1 : 0 });
  });
  
  document.getElementById('btn-reset').addEventListener('click', function() {
    TweenMax.to(sliderLeft, 0.5, { x: 0, onUpdate: doUpdate });
    TweenMax.to(sliderRight, 0.5, { x: totalWidth, onUpdate: doUpdate });
  });
  
  // Calcular scale do data-htmler-blocks baseado no SVG
  function updateBlocksScale() {
    var blocks = document.querySelector('[data-htmler-blocks]');
    if (blocks && svg) {
      var sx = svg.clientWidth / 1050;
      if (sx > 0) {
        blocks.style.transform = 'scale(' + sx + ')';
        blocks.style.height = '900px';
      }
    }
  }
  updateBlocksScale();
  window.addEventListener('resize', updateBlocksScale);
  
  // Forçar criação do _gsTransform
  TweenMax.set(sliderLeft, { x: 0 });
  TweenMax.set(sliderRight, { x: totalWidth });
  // Garantir que o GSAP processou
  TweenMax.ticker.addEventListener('tick', function() {
    TweenMax.ticker.removeEventListener('tick', arguments.callee);
    doUpdate();
  });
}
  
  init();
})();