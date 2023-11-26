// https://github.com/vitejs/vite/issues/544

import fs from 'fs'

export default function AppVue(version) {
  // We will use the dev Vue url from a CDN to extract all the export names
  // and provide them as ESM module export from the global Vue instance.
  // The main app file uses the same CDN as well.
  const devVueUrl = `https://unpkg.com/vue@${version}/dist/vue.global.js`

  const vueAliasTmpFilePath = `./.vue.alias.js`
  const exportMatchRegex = /exports\.(\w+)/gm

  return {
    name: 'vite-plugin-global-vue',

    config: () => ({
      resolve: {
        alias: [{ find: 'vue', replacement: vueAliasTmpFilePath }],
      },
    }),

    async buildStart() {
      const src = await (await fetch(devVueUrl)).text()

      const uniqueExports = new Set()

      let content = ''

      let match

      while ((match = exportMatchRegex.exec(src)) !== null) {
        uniqueExports.add(match[1])
      }

      uniqueExports.forEach(name => {
        content += `export const ${name} = Vue.${name};\n`
      })

      fs.writeFileSync(vueAliasTmpFilePath, content)
    },

    buildEnd() {
      fs.unlinkSync(vueAliasTmpFilePath)
    },
  }
}
