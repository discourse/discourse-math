import { withPluginApi } from "discourse/lib/plugin-api";
import loadScript from "discourse/lib/load-script";

function ensureKaTeX() {
  return loadScript("/plugins/discourse-math/katex/katex.min.js").then(() => {
    return loadScript("/plugins/discourse-math/katex/katex.min.css", {
      css: true,
    }).then(() => {
      return loadScript("/plugins/discourse-math/katex/mhchem.min.js");
    });
  });
}

function decorate(elem, macros) {
  const $elem = $(elem);
  const displayMode = elem.tagName === "DIV";

  if ($elem.data("applied-katex")) {
    return;
  }
  $elem.data("applied-katex", true);

  if ($elem.hasClass("math")) {
    const tag = elem.tagName === "DIV" ? "div" : "span";
    const displayClass = tag === "div" ? "block-math" : "inline-math";
    const text = $elem.text();
    $elem.addClass(`math-container ${displayClass} katex-math`).text("");
    window.katex.render(text, elem, { displayMode, macros });
  }
}

function katex($elem) {
  if (!$elem || !$elem.find) {
    return;
  }

  const mathElems = $elem.find(".math");

  if (mathElems.length > 0) {
    ensureKaTeX().then(() => {
      // enable persistent macros: https://katex.org/docs/api.html#persistent-macros
      const macros = {};
      mathElems.each((idx, elem) => decorate(elem, macros));
    });
  }
}

function initializeMath(api) {
  api.decorateCooked(
    function (elem) {
      katex(elem);
    },
    { id: "katex" }
  );
}

export default {
  name: "apply-math-katex",
  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");
    if (
      siteSettings.discourse_math_enabled &&
      siteSettings.discourse_math_provider === "katex"
    ) {
      withPluginApi("0.5", function (api) {
        initializeMath(api);
      });
    }
  },
};
