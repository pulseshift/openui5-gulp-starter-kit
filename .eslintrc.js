/**
 * @author PulseShift GmbH
 *
 * GENERAL EXPLANATION
 * We only want errors or no errors. A warning can be interpreded differently.
 * Therfore all lint rules must be either off or error. Warnings will waste time.

 * The keyword IDEA will mark comments, explaining why the rule differs to other linting rule sets (e.g. from airbnb)
 */

module.exports = {

    'env': {
        'browser': true,
        'node': true,
        'es6': true
    },

    'extends': 'eslint:recommended',

    'parser': 'babel-eslint',

    'parserOptions': {
        'ecmaVersion': 7,
        'sourceType': 'module',
        'ecmaFeatures': {
            'experimentalObjectRestSpread': true
        }
    },

    'plugins': [
        'babel'
    ],

    // define globals (sap is at the time only relevant for OpenUI5 apps)
    'globals': {
        '$': false,
        'jQuery': false,
        'sap': false
    },

    'rules': {

        /* =========================================================== */
        /* plugin rules                                                */
        /* =========================================================== */


        /* =========================================================== */
        /* basic eslint rules                                          */
        /* =========================================================== */

        // TODO: check if this rule can be applied depending on the project (temporary activated, because UI5 is not transformed to es7, yet)
        // require ASI instead use of semicolons (react projects only)
        'semi': 'error',

        // disallow unnecessary semicolons
        'no-extra-semi': 'error',

        // enforce spacing before and after semicolons
        'semi-spacing': ['error', {
            'before': false,
            'after': true
        }],

        // disallow use of console
        'no-console': 'error',

        // disallow declaration of variables that are not used in the code
        'no-unused-vars': ['error', {
            'vars': 'local',
            'args': 'after-used',
            // allow some variables, that are declared/imported by default
            'varsIgnorePattern': 'React'
        }],

        // disallow trailing commas
        'comma-dangle': ['error', 'never'],

        // disallow assignment in conditional expressions
        'no-cond-assign': ['error', 'always'],

        // disallow use of constant expressions in conditions
        'no-constant-condition': 'error',

        // disallow control characters in regular expressions
        'no-control-regex': 'error',

        // disallow use of debugger
        'no-debugger': 'error',

        // disallow duplicate arguments in functions
        'no-dupe-args': 'error',

        // disallow duplicate keys when creating object literals
        'no-dupe-keys': 'error',

        // disallow a duplicate case label
        'no-duplicate-case': 'error',

        // disallow the use of empty character classes in regular expressions
        'no-empty-character-class': 'error',

        // disallow empty statements
        'no-empty': 'error',

        // disallow assigning to the exception in a catch block
        'no-ex-assign': 'error',

        // disallow double-negation boolean casts in a boolean context
        'no-extra-boolean-cast': 'error',

        // disallow unnecessary parentheses
        'no-extra-parens': ['error', 'functions'],

        // disallow overwriting functions written as function declarations
        'no-func-assign': 'error',

        // disallow function or variable declarations in nested blocks
        'no-inner-declarations': ['error', 'functions'],

        // disallow invalid regular expression strings in the RegExp constructor
        'no-invalid-regexp': 'error',

        // disallow irregular whitespace outside of strings and comments
        'no-irregular-whitespace': 'error',

        // deprecated in favor of no-unsafe-negation
        'no-negated-in-lhs': 'off',

        // disallow negating the left operand of relational operators
        'no-unsafe-negation': 'error',

        // disallow the use of object properties of the global object (Math and JSON) as functions
        'no-obj-calls': 'error',

        // disallow multiple spaces in a regular expression literal
        'no-regex-spaces': 'error',

        // disallow sparse arrays
        'no-sparse-arrays': 'error',

        // disallow trailing whitespace at the end of lines
        'no-trailing-spaces': 'error',

        // disallow unreachable statements after a return, throw, continue, or break statement
        'no-unreachable': 'error',

        // disallow comparisons with the value NaN
        'use-isnan': 'error',

        // ensure JSDoc comments are valid
        // IDEA: jsdoc is an important part of product documentation, only valid jsdoc (if used) will be accapted
        'valid-jsdoc': ['error', {
            'requireReturn': false
        }],

        // ensure that the results of typeof are compared against a valid string
        'valid-typeof': ['error', { requireStringLiterals: true }],

        // enforces getter/setter pairs in objects
        'accessor-pairs': 'off',

        // treat var statements as if they were block scoped
        'block-scoped-var': 'error',

        // turn off require return statements to either always or never specify values
        // IDEA: no return statement will ever return undefined, a dummy return will not increase readability
        'consistent-return': 'off',

        // specify curly brace conventions for all control statements
        'curly': ['error', 'multi-line'],

        // require default case in switch statements
        'default-case': ['error', { commentPattern: '^no default$' }],

        // disallow the use of alert, confirm, and prompt
        'no-alert': 'error',

        // disallow use of arguments.caller or arguments.callee
        'no-caller': 'error',

        // disallow division operators explicitly at beginning of regular expression
        'no-div-regex': 'error',

        // disallow else after a return in an if
        'no-else-return': 'error',

        // disallow use of eval()
        'no-eval': 'error',

        // disallow adding to native types
        'no-extend-native': 'error',

        // disallow unnecessary function binding
        'no-extra-bind': 'error',

        // disallow fallthrough of case statements
        'no-fallthrough': 'error',

        // disallow the use of leading or trailing decimal points in numeric literals
        'no-floating-decimal': 'error',

        // disallow use of eval()-like methods
        'no-implied-eval': 'error',

        // disallow usage of __iterator__ property
        'no-iterator': 'error',

        // disallow use of labels for anything other then loops and switches
        'no-labels': ['error', { allowLoop: false, allowSwitch: false }],

        // disallow unnecessary nested blocks
        'no-lone-blocks': 'error',

        // disallow creation of functions within loops
        'no-loop-func': 'error',

        // disallow magic numbers
        'no-magic-numbers': ['off', {
            'ignore': [],
            'ignoreArrayIndexes': true,
            'enforceConst': true,
            'detectObjects': false
        }],

        // disallow reassignments of native objects or read-only globals
        'no-global-assign': ['error', { exceptions: [] }],

        // deprecated in favor of no-global-assign
        'no-native-reassign': 'off',

        // disallow use of new operator for Function object
        'no-new-func': 'error',

        // disallows creating new instances of String, Number, and Boolean
        'no-new-wrappers': 'error',

        // disallow use of new operator when not part of the assignment or comparison
        'no-new': 1,

        // disallow use of octal escape sequences in string literals, such as
        // var foo = 'Copyright \251';
        'no-octal-escape': 'error',

        // disallow use of (old style) octal literals
        'no-octal': 'error',

        // disallow usage of __proto__ property
        'no-proto': 'error',

        // disallow declaring the same variable more then once
        'no-redeclare': 'error',

        // disallow use of assignment in return statement
        'no-return-assign': 'error',

        // disallow use of `javascript:` urls.
        'no-script-url': 'error',

        // disallow comparisons where both sides are exactly the same
        'no-self-compare': 'error',

        // disallow use of comma operator
        'no-sequences': 'error',

        // disallow usage of expressions in statement position
        'no-unused-expressions': ['error', {
            'allowShortCircuit': false,
            'allowTernary': false,
        }],

        // disallow use of void operator
        'no-void': 'error',

        // allow usage of configurable warning terms in comments: e.g. todo
        'no-warning-comments': ['off', { terms: ['bug', 'todo', 'fix', 'hack', 'idea', 'note', 'review', 'fixme', 'xxx'], location: 'start' }],

        // disallow use of the with statement
        'no-with': 'error',

        // require use of the second argument for parseInt()
        'radix': 'error',

        // require immediate function invocation to be wrapped in parentheses
        'wrap-iife': ['error', 'outside'],

        // disallow Yoda conditions
        'yoda': 'error',

        // babel inserts `'use strict';` for us
        strict: ['error', 'never'],

        // allow the catch clause parameter name being the same as a variable in the outer scope
        // (if you do not need to support IE 8 and earlier, you should turn this rule off)
        'no-catch-shadow': 'off',

        // disallow deletion of variables
        'no-delete-var': 'error',

        // disallow labels that share a name with a variable
        'no-label-var': 'error',

        // disallow shadowing of names such as arguments
        'no-shadow-restricted-names': 'error',

        // disallow use of undefined when initializing variables
        'no-undef-init': 'error',

        // disallow use of undeclared variables unless mentioned in a /*global */ block
        'no-undef': 'error',

        // disallow use of variables before they are defined
        'no-use-before-define': 'error',

        // enforce one true brace style
        'brace-style': ['error', '1tbs', { allowSingleLine: true }],

        // require camel case names
	      'camelcase': ['error', { properties: 'never' }],

        // enforces consistent naming when capturing the current execution context
        'consistent-this': 'off',

        // disallow mixed 'LF' and 'CRLF' as linebreaks
        'linebreak-style': ['error', 'unix'],

        // specify the maximum depth callbacks can be nested
        'max-nested-callbacks': 'off',

        // require a capital letter for constructors
        'new-cap': ['error', {
            'newIsCap': true,
            'newIsCapExceptions': [],
            'capIsNew': false,
            'capIsNewExceptions': ['Immutable.Map', 'Immutable.Set', 'Immutable.List'],
        }],

        // disallow the omission of parentheses when invoking a constructor with no arguments
        'new-parens': 'error',

        // disallow use of the Array constructor
        'no-array-constructor': 'error',

        // disallow if as the only statement in an else block
        'no-lonely-if': 'error',

        // disallow mixed spaces and tabs for indentation
        'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],

        // disallow nested ternary expressions
        'no-nested-ternary': 'error',

        // disallow use of the Object constructor
        'no-new-object': 'error',

        // disallow space between function identifier and application
        'no-spaced-func': 'error',

        // require quotes around object literal property names
        'quote-props': ['error', 'as-needed', { keywords: false, unnecessary: true, numbers: false }],

        // disallow double quotes
        quotes: ["error", "single", { "avoidEscape": true, "allowTemplateLiterals": true }],

        // require a space before & after certain keywords
        'keyword-spacing': ['error', {
            'before': true,
            'after': true,
            'overrides': {
                'return': { 'after': true },
                'throw': { 'after': true },
                'case': { 'after': true }
            }
        }],

        // require spaces around operators
        'space-infix-ops': 'error',

        // Require or disallow spaces before/after unary operators
        'space-unary-ops': ['error', {
            'words': true,
            'nonwords': false,
            'overrides': {}
        }]
    }
};
