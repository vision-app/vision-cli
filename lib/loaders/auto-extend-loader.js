const fs = require('fs');
const path = require('path');
const { VueExtendTree } = require('vue-component-analyzer');

const cssExtendRE = /^@extend;/im;
const vueExtendTree = new VueExtendTree();

function findSuperByCSSPath(cssPath, loader) {
    let jsPath;
    if (cssPath.endsWith('.vue/module.css'))
        jsPath = path.join(cssPath, '../index.js');
    else
        jsPath = cssPath;

    vueExtendTree.loader = loader;
    return vueExtendTree.findSuperByPath(jsPath).then((supr) => {
        if (supr.isVue)
            throw new Error('Unsupport auto extend for single vue files');

        const superCSSPath = path.join(supr.fullPath, '../module.css');
        if (fs.existsSync(superCSSPath))
            return superCSSPath;
        else
            return findSuperByCSSPath(superCSSPath, loader);
    });
}

module.exports = function (content) {
    const callback = this.async();
    this.cacheable();

    const found = content.match(cssExtendRE);
    if (!found)
        return callback(null, content);

    findSuperByCSSPath(this.resourcePath, this).then((superCSSPath) => {
        const relativePath = path.relative(path.join(this.resourcePath, '../'), superCSSPath);
        content = content.slice(0, found.index) + `@extend '${relativePath}';` + content.slice(found.index + 8);
        callback(null, content);
    }).catch((e) => callback(e));
};