import { withPluginApi } from "discourse/lib/plugin-api";
import loadScript from "discourse/lib/load-script";

let initializedMathJax = false;

function initMathJax(opts) {
  if (initializedMathJax) {
    return;
  }

  var extensions = ["toMathML.js", "Safe.js"];

  if (opts.enable_accessibility) {
    extensions.push("[a11y]/accessibility-menu.js");
  }

  var settings = {
    jax: ["input/TeX", "input/AsciiMath", "input/MathML", "output/CommonHTML"],
    TeX: { extensions: ["AMSmath.js", "AMSsymbols.js", "autoload-all.js"] },
    extensions: extensions,
    showProcessingMessages: false,
    root: Discourse.getURLWithCDN("/plugins/discourse-math/mathjax")
  };

  if (opts.zoom_on_hover) {
    settings.menuSettings = { zoom: "Hover" };
    settings.MathEvents = { hover: 750 };
  }
  window.MathJax = settings;
  initializedMathJax = true;
}

function ensureMathJax(opts) {
  initMathJax(opts);
  return loadScript("/plugins/discourse-math/mathjax/MathJax.2.7.5.js");
}

function decorate(elem, isPreview) {
  const $elem = $(elem);

  if ($elem.data("applied-mathjax")) {
    return;
  }
  $elem.data("applied-mathjax", true);

  let $mathWrapper, $math;

  if ($elem.hasClass("math")) {
    const tag = elem.tagName === "DIV" ? "div" : "span";
    const display = tag === "div" ? "; mode=display" : "";
    $mathWrapper = $(
      `<${tag} style="display: none;"><script type="math/tex${display}"></script></${tag}>`
    );
    $math = $mathWrapper.children();
    $math.text($elem.text());
    $elem.after($mathWrapper);
  } else if ($elem.hasClass("asciimath")) {
    $mathWrapper = $(
      `<span style="display: none;"><script type="math/asciimath"></script></span>`
    );
    $math = $mathWrapper.children();
    $math.text($elem.text());
    $elem.after($mathWrapper);
  }

  Ember.run.later(
    this,
    () => {
      window.MathJax.Hub.Queue(() => {
        // don't bother processing previews removed from DOM
        if (elem.parentElement && elem.parentElement.offsetParent !== null) {
          window.MathJax.Hub.Typeset($math[0], () => {
            $elem.remove();
            $mathWrapper.show();
          });
        }
      });
    },
    isPreview ? 200 : 0
  );
}

function mathjax($elem, opts) {
  if (!$elem || !$elem.find) {
    return;
  }

  let mathElems;
  if (opts.enable_asciimath) {
    mathElems = $elem.find(".math, .asciimath");
  } else {
    mathElems = $elem.find(".math");
  }

  if (mathElems.length > 0) {
    const isPreview = $elem.hasClass("d-editor-preview");

    ensureMathJax(opts).then(() => {
      mathElems.each((idx, elem) => decorate(elem, isPreview));
    });
  }
}

function initializeMath(api, discourse_math_opts) {
  api.decorateCooked(
    function(elem) {
      mathjax(elem, discourse_math_opts);
    },
    { id: "mathjax" }
  );
}

export default {
  name: "apply-math-mathjax",
  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");
    let discourse_math_opts = {
      zoom_on_hover: siteSettings.discourse_math_zoom_on_hover,
      enable_accessibility: siteSettings.discourse_math_enable_accessibility,
      enable_asciimath: siteSettings.discourse_math_enable_asciimath
    };
    if (
      siteSettings.discourse_math_enabled &&
      siteSettings.discourse_math_provider === "mathjax"
    ) {
      withPluginApi("0.5", function(api) {
        initializeMath(api, discourse_math_opts);
      });
    }
  }
};
