'use strict';

// NodeList for... of... polyfill
// For Blink only... remove once support is added
// -----------------------------------------------------------------------------
function helperPolyfills() {
  NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

// debounce
// returns a function that, as long as it continues to be invoked,
// will not be triggered
// -----------------------------------------------------------------------------
function debounce(func, wait, immediate) {
  let timeout;

  return () => {
    let context = this;
    let args = arguments;
    let later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    let callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(context, args);
    }
  };
}

// (un)lockBody
// enable / disable vertical scrolling on the <body>
// ----------------------------------------------------------------------------
function lockBody(HAS_SCROLLBAR, WIDTH_SCROLLBAR) {
  // enable overflow-y: hidden on <html> and <body>
  document.documentElement.setAttribute('data-scrollable', 'locked');
  // if necessary, accomodate for scrollbar width
  if (HAS_SCROLLBAR) {
    // converted to rems... may want to consider leaving it as pixels
    document.body.style.paddingRight = (WIDTH_SCROLLBAR / 10) + 'rem';
  }
}

function unlockBody(HAS_SCROLLBAR) {
  // disable overflow-y: hidden on <html> and <body>
  document.documentElement.setAttribute('data-scrollable', 'unlocked');
  // if necessary, remove scrollbar width styles
  // and remove inline style for padding-right
  if (HAS_SCROLLBAR) {
    document.body.style.paddingRight = null;
  }
}

// windowScrollTop
// ensure every page load puts the user at the very top of the screen
// ---------------------------------------------------------------------------
function windowScrollTop() {
  // load page at top of document...
  window.scroll(0, 0);
  // chrome remembers your scroll position on reload,
  // so using pushState helps return us to the top of the page every time...
  // problem is, we then have to hit 'Back' twice... seems acceptable for single page sites
  if (history.pushState) {
    history.pushState(null, null, '');
    window.scroll(0, 0);
  }
}

// getFirstChild
// get the firstChild of an element that is not a textNode
// ----------------------------------------------------------------------------
function getFirstChild(el) {
  let firstChild = el.firstChild;
  while (firstChild != null && firstChild.nodeType == 3) { // skip TextNodes
    firstChild = firstChild.nextSibling;
  }
  return firstChild;
  // usage: getFirstChild( document.getElementById('element_id') );
}

// getRandomInt
// get a random number between a min and max range
// ----------------------------------------------------------------------------
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// export functions
// ----------------------------------------------------------------------------
export {helperPolyfills, debounce, lockBody, unlockBody, windowScrollTop, getFirstChild, getRandomInt};
