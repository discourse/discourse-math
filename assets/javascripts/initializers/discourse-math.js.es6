import { withPluginApi } from 'discourse/lib/plugin-api';
import loadScript from 'discourse/lib/load-script';

let initializedMathJax = false;

// The site settings are grabbed in the exported initialize function.
// I'm not sure what the best way to make that variable available to the
// other functions in the file. I decided to introduce a variable that's
// local to this file but available accross the file. I'm curious if there's
// a better approach?
// Mark McClure, while adding a zoom on click option.
let file_site_settings;

function initMathJax() {
  if (initializedMathJax) { return; }

  var settings = {
    jax: ['input/TeX', 'input/AsciiMath', 'input/MathML', 'output/CommonHTML'],
    TeX: {extensions: ["AMSmath.js", "AMSsymbols.js", "autoload-all.js"]},
    extensions: ["toMathML.js"],
    showProcessingMessages: false,
    root: '/plugins/discourse-math/mathjax'
  }
  if(file_site_settings.discourse_math_zoom_on_click) {
    settings.menuSettings = {zoom:"Click",zscale:"200%"}
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
    file_site_settings = siteSettings;
    if (siteSettings.discourse_math_enabled) {
      withPluginApi('0.5', initializeMath);
    }
  }
};
