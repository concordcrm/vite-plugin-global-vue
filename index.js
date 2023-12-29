// https://github.com/vitejs/vite/issues/544

import fs from 'fs'

export default function AppVue(config) {
  const exportMatchRegex = /exports\.(\w+)/gm
  const vueAliasTmpFileName = `.vue.alias.js`
  let vueAliasTmpPath = ''

  let version = ''
  let rootPath = ''

  if (typeof config === 'string') {
    version = config
  } else if (typeof config === 'object') {
    version = config.version
    rootPath = config.rootPath || ''
  }

  if (!version) {
    version = getVersionFromConfigFile(rootPath)
  }

  // We will use the dev Vue URL from a CDN to extract all the export names
  // and provide them as ESM module export from the global Vue instance.
  // Note that the main app file uses the same CDN as well.
  const devVueUrl = `https://unpkg.com/vue@${version}/dist/vue.global.js`

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

  function getVersionFromConfigFile(rootPath) {
    // semver matching support
    const versionMatchRegex =
      /'vue_version'\s*=>\s*'((\d+)\.(\d+)\.(\d+)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?)'/

    try {
      const formattedRootPath =
        rootPath && rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath

      const filePath = `${
        formattedRootPath ? formattedRootPath + '/' : ''
      }config/app.php`

      return fs.readFileSync(filePath, 'utf8').match(versionMatchRegex)[1]
    } catch (error) {
      throw new Error('Failed to read config/app.php file.')
    }
  }
}
