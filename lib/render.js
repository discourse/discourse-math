const mj = require("mathjax-node");
mj.config({ fontURL: "/plugins/discourse-math/mathjax/fonts/HTML-CSS" });

require("readline")
  .createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  })
  .on("line", line => {
    var obj = Object.assign(JSON.parse(line), { html: true });
    mj.typeset(obj, result => console.log(JSON.stringify(result)));
  });
