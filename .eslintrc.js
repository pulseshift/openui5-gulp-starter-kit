/**
 * @author PulseShift GmbH
 *
 * GENERAL EXPLANATION
 * We only want errors or no errors. A warning can be interpreded differently.
 * Therfore all lint rules must be either off or error. Warnings will waste time.
 */

module.exports = {
  env: {
    browser: true, // allow browser global variables
    node: false, // allow Node.js global variables and Node.js-specific rules
    es6: true, // enable all ECMAScript 6 features except for modules
    jquery: true // enable jquery global variables
  },

  extends: ['eslint:recommended', 'prettier'],

  parser: 'babel-eslint',

  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
      experimentalObjectRestSpread: true
    }
  },

  plugins: ['babel', 'prettier'],

  // define globals
  globals: {
    ui5: false,
    sap: false,
    moment: false
  }
}
