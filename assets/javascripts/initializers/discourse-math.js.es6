import { withPluginApi } from 'discourse/lib/plugin-api';
import loadScript from 'discourse/lib/load-script';

let initializedMathJax = false;

function initMathJax() {
  if (initializedMathJax) { return; }

  window.MathJax = {
    jax: ['input/TeX', 'input/AsciiMath', 'input/MathML', 'output/CommonHTML'],
    TeX: {extensions: ["AMSmath.js", "AMSsymbols.js", "autoload-all.js"]},
    extensions: ["toMathML.js"],
    showProcessingMessages: false,
    root: '/plugins/discourse-math/mathjax'
  };

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

  const tag = elem.tagName === "DIV" ? "div" : "span";
  const display = tag === "div" ? "; mode=display" : "";

  const $mathWrapper = $(`<${tag} style="display: none;"><script type="math/tex${display}"></script></${tag}>`);
  const $math = $mathWrapper.children();

  $math.html($elem.text());
  $elem.after($mathWrapper);

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
  const mathElems = $elem.find('.math');

  if (mathElems.length > 0) {
    const isPreview = $elem.hasClass('d-editor-preview');

    ensureMathJax().then(()=>{
      mathElems.each((idx,elem) => decorate(elem, isPreview));
    });
  }
}

function initializeMath(api) {
  api.decorateCooked(mathjax);
}

export default {
  name: "apply-math",
  initialize(container) {
    const siteSettings = container.lookup('site-settings:main');
    if (siteSettings.discourse_math_enabled) {
      withPluginApi('0.5', initializeMath);
    }
  }
};
