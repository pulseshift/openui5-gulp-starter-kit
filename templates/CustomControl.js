/**
 *
 * Search and replace the following constants or
 * create a handlebar template and automate the cstom control creation.
 *
 * {{year}} e.g. 2016
 * {{owner}} e.g. MyCompany AG
 * {{developer}} e.g. Jascha Quintern
 * {{today}} e.g. 20.07.2016
 * {{control}} e.g. Button
 * {{description}} e.g. a Button that can be clicked
 * {{lib}} e.g. my.lib.ui
 * {{version}} usually you start with 1.0.0
 *
 */

/**
 * UI development toolkit enhancement for HTML5 (OpenUI5)
 * (c) Copyright {{year}} {{owner}}, all rights reserved.
 * Created by {{developer}} on {{today}}.
 */
sap.ui.define([
        'sap/ui/core/Control',
        './library'
    ],
    function(Control, library) {

        'use strict'

        /**
         * Constructor for a new <code>{{lib}}.{{control}}</code>.
         *
         * @param {string} [sId] Id for the new control, generated automatically if no id is given
         * @param {object} [mSettings] Initial settings for the new control
         *
         * @class
         * The <code>{{control}}</code> control: {{description}}.
         *
         * @extends sap.ui.core.Control
         *
         * @author {{owner}}
         * @version {{version}}
         *
         * @constructor
         * @public
         * @alias {{lib}}.{{control}}
         */
        var {{control}} = Control.extend('{{lib}}.{{control}}', {

            /* =========================================================== */
            /* meta data definition                                        */
            /* =========================================================== */

            metadata: {
                library: '{{lib}}',
                properties: {

                    /**
                     * Sets the text of my sample control.
                     * @since: 1.0.0
                     */
                    sampleProperty: { type: 'string', group: 'Appearance', defaultValue: null },

                },
                aggregations: {

                    /**
                     * Optional <code>Button</code> displayed somewhere in my sample control.
                     * @since: 1.0.0
                     */
                    sampleAggregation: { type: 'sap.m.Button', multiple: false }

                },
                associations: {},
                events: {

                    /**
                     * Fires when my <code>sampleAggregation</code> button was pressed.
                     */
                    sampleEvent: {
                        parameters: {

                            /**
                             * Some information relevant for the event receiver.
                             */
                            sampleParameter: { type: 'string' }

                        }
                    }

                }
            },

            /* =========================================================== */
            /* private attributes                                          */
            /* =========================================================== */

            /**
             * Reference to e.g. a control instance used in my sample control.
             * @type {object}
             * @since: 1.0.0
             */
            _privateAttribute: null,


            /* =========================================================== */
            /* lifecycle methods                                           */
            /* =========================================================== */

            /**
             * The init() method can be used to set up, for example, internal variables or subcontrols of a composite control.
             * If the init() method is implemented, SAPUI5 invokes the method for each control instance directly after the constructor method.
             * @private
             * @override
             */
            init() {
                // only apply inherited init method if required, check if init method was implemented in the control you extended
                // Control.prototype.init.apply( this, arguments )
            },

            /**
             * Constructor for a new <code>{{lib}}.{{control}}</code>.
             *
             * @param {string} [sId] Id for the new control, generated automatically if no id is given
             * @param {object} [mSettings] Initial settings for the new control
             */
            constructor() {
                // only apply inherited constructor method if required, check if constructor method was implemented in the control you extended
                Control.prototype.constructor.apply( this, arguments )
            },

            /**
             * Method called before control gets rendered
             * @private
             * @override
             */
            onBeforeRendering() {
                // only apply inherited onBeforeRendering method if required, check if onBeforeRendering method was implemented in the control you extended
                // Control.prototype.onBeforeRendering.apply( this, arguments )
            },

            /**
             * Renderer function of control <code>{{lib}}.{{control}}</code>.
             *
             * @param {object} [oRm] Render Manager
             * @param {object} [oControl] Current control (this)
             */
            renderer(oRm, oControl) {

                // start render wrapper div
                oRm.write('<div')
                oRm.writeControlData(oControl)
                oRm.addClass({{control}}.CSS_CLASS)
                oRm.writeClasses()
                oRm.write('>')

                // render e.g. controls handed set by an aggregation
                oRm.renderControl(oControl.getAggregation('sampleAggregation'))

                // end render wrapper div
                oRm.write('</div>')

            },

            /**
             * Method called after control gets rendered
             * @private
             * @override
             */
            onAfterRendering() {
                // only apply inherited onAfterRendering method if required, check if onAfterRendering method was implemented in the control you extended
                // Control.prototype.onAfterRendering.apply( this, arguments )
            },

            /**
             * The exit() method is used to clean up resources and to deregister event handlers.
             * If the exit() method is implemented, SAPUI5 core invokes the method for each control instance when it is destroyed.
             * @private
             * @override
             */
            exit() {
                // Control.prototype.exit.apply( this, arguments )
            },


            /* =========================================================== */
            /* constants                                                   */
            /* =========================================================== */

            /**
             * The base CSS class name of control <code>{{control}}</code>.
             * @private
             * @type {string}
             */
            CSS_CLASS: '{{lib}}-{{control}}',


            /* =========================================================== */
            /* public methods                                              */
            /* =========================================================== */

            /**
             * Description what <code>publicMethod</code> does.
             *
             * @param {string} [sParameter] Description of function parameter
             * @return {{{lib}}.{{control}}} <code>this</code> to allow method chaining (return this if no other return parameter is reuired)
             * @public
             */
            publicMethod(sParameter) {
                // code of your public method
                return this
            },


            /* =========================================================== */
            /* override methods                                            */
            /* =========================================================== */

            /**
             * Description of the overrided method.
             *
             * @param {string} [sParameter] Description of function parameter
             * @return {{{lib}}.{{control}}} <code>this</code> to allow method chaining (return this if no other return parameter is required)
             * @public
             * @override
             */
            overrideExistingMethod(sParameter) {
                // code of your override method
                return this
            },


            /* =========================================================== */
            /* private methods                                             */
            /* =========================================================== */

            /**
             * Description what <code>_privateMethod</code> does.
             *
             * @param {string} [sParameter] Description of function parameter
             * @return {{{lib}}.{{control}}} <code>this</code> to allow method chaining (return this if no other return parameter is required)
             * @private
             */
            _privateMethod(sParameter) {
                // code of your public method
                return this
            }

        })


        return {{control}}

    }, /* bExport= */ true)
