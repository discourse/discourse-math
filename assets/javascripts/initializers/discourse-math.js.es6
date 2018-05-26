import { withPluginApi } from 'discourse/lib/plugin-api';
import loadScript from 'discourse/lib/load-script';

let initializedMathJax = false;
let zoom_on_hover, enable_accessibility;

function initMathJax() {
  if (initializedMathJax) { return; }

  var extensions = ["toMathML.js", "Safe.js"];

  if (enable_accessibility) {
    extensions.push("[a11y]/accessibility-menu.js");
  }

  var settings = {
    jax: ['input/TeX', 'input/AsciiMath', 'input/MathML', 'output/CommonHTML'],
    TeX: {extensions: ["AMSmath.js", "AMSsymbols.js", "autoload-all.js"]},
    extensions: extensions,
    showProcessingMessages: false,
    root: '/plugins/discourse-math/mathjax'
  };

  if(zoom_on_hover) {
    settings.menuSettings = {zoom: "Hover"};
    settings.MathEvents = {hover: 750};
  }
  window.MathJax = settings;
  initializedMathJax = true;
}

function ensureMathJax(){
  initMathJax();
  return loadScript('/plugins/discourse-math/mathjax/MathJax.1.7.1.js');
}

function decorate(elem, isPreview){
  const $elem= $(elem);

  if ($elem.data('applied-mathjax')){
    return;
  }
  $elem.data('applied-mathjax', true);

  if($elem.hasClass('math')) {
    const tag = elem.tagName === "DIV" ? "div" : "span";
    const display = tag === "div" ? "; mode=display" : "";
    var $mathWrapper = $(`<${tag} style="display: none;"><script type="math/tex${display}"></script></${tag}>`);
    var $math = $mathWrapper.children();
    $math.html($elem.text());
    $elem.after($mathWrapper);
  }
  else if($elem.hasClass('asciimath')) {
    // const tag = elem.tagName === "DIV" ? "div" : "span";
    // const display = tag === "div" ? "; mode=display" : "";
    var $mathWrapper = $(`<span style="display: none;"><script type="math/asciimath"></script></span>`);
    var $math = $mathWrapper.children();
    $math.html($elem.text());
    $elem.after($mathWrapper);
  }

  Em.run.later(this, ()=> {
    window.MathJax.Hub.Queue(() => {
      // don't bother processing previews removed from DOM
      if (elem.parentElement && elem.parentElement.offsetParent !== null) {
        window.MathJax.Hub.Typeset($math[0], ()=> {
          $elem.remove();
          $mathWrapper.show();
        });
      }
    });
  }, isPreview ? 200 : 0);
}

function mathjax($elem) {

  if (!$elem || !$elem.find) {
    return;
  }

  const mathElems = $elem.find('.math, .asciimath');

  if (mathElems.length > 0) {
    const isPreview = $elem.hasClass('d-editor-preview');

    ensureMathJax().then(()=>{
      mathElems.each((idx,elem) => decorate(elem, isPreview));
    });
  }
}

function findProperties(obj) {
    var aPropertiesAndMethods = [];

    do {
        aPropertiesAndMethods = aPropertiesAndMethods.concat(Object.getOwnPropertyNames(obj));
    } while (obj = Object.getPrototypeOf(obj));

    for ( var a = 0; a < aPropertiesAndMethods.length; ++a) {
        for ( var b = a + 1; b < aPropertiesAndMethods.length; ++b) {
            if (aPropertiesAndMethods[a] === aPropertiesAndMethods[b]) {
                aPropertiesAndMethods.splice(a--, 1);
            }
        }
    }

    return aPropertiesAndMethods;
}

function initializeMath(api) {
  api.decorateCooked(mathjax);
}

export default {
  name: "apply-math",
  initialize(container) {
    const siteSettings = container.lookup('site-settings:main');
    zoom_on_hover = siteSettings.discourse_math_zoom_on_hover;
    enable_accessibility = siteSettings.discourse_math_enable_accessibility;
    if (siteSettings.discourse_math_enabled) {
      withPluginApi('0.5', initializeMath);
    }
  }
};
