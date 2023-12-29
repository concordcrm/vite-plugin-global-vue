// https://github.com/vitejs/vite/issues/544

import fs from 'fs'

export const versionMatchRegex =
  /'vue_version'\s*=>\s*'((\d+)\.(\d+)\.(\d+)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?)'/

export default function AppVue(version) {
  // We will use the dev Vue url from a CDN to extract all the export names
  // and provide them as ESM module export from the global Vue instance.
  // The main app file uses the same CDN as well.
  const devVueUrl = `https://unpkg.com/vue@${version}/dist/vue.global.js`
  const exportMatchRegex = /exports\.(\w+)/gm

  const vueAliasTmpFileName = `.vue.alias.js`
  let vueAliasTmpPath = null

  return {
    name: 'vite-plugin-global-vue',

    config: () => ({
      resolve: {
        alias: [
          {
            find: 'vue',
            customResolver: () => vueAliasTmpPath,
          },
        ],
      },
    }),

    configResolved(resolvedConfig) {
      vueAliasTmpPath = `${resolvedConfig.root}/${vueAliasTmpFileName}`
    },

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

      fs.writeFileSync(vueAliasTmpPath, content)
    },

    buildEnd() {
      fs.unlinkSync(vueAliasTmpPath)
    },
  }
}
