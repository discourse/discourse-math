
## How to build KaTeX for Discourse

1. `git clone https://github.com/KaTeX/KaTeX.git && cd KaTeX`

    `git submodule update --init --recursive`

2. Disable TTF fonts:

   `export USE_TTF=false`

3. Run build to fetch the fonts into `dist/fonts/`

   `npm run build`

4. Copy fonts to this plugin

   `cp dist/fonts/* discourse-math/public/katex/fonts/`

5. Change paths to fonts ((otherwise the fonts won't load in Discourse):

    `sed -ri 's/@font-folder.+$/@font-folder:
"\/plugins\/discourse-math\/katex\/fonts";/'
submodules/katex-fonts/fonts.less`

3. Build KaTeX:

   `yarn && yarn builld`

4. Copy `katex.min.js` and `katex.min.css` from `dist/` to
`discourse-math/public/katex/`

