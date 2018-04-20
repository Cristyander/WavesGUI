(function () {
    'use strict';

    /**
     * @param {User} user
     * @param {app.utils} utils
     * @return {Base}
     */
    const factory = function (user, utils) {

        class Base {

            /**
             * @constructor
             * @param {$rootScope.Scope} [$scope]
             */
            constructor($scope) {
                this.__emitterListeners = Object.create(null);
                if ($scope) {
                    const stop = $scope.$on('$destroy', () => {
                        this.$onDestroy();
                        stop();
                    });
                }

                /**
                 * @type {IBaseSignals}
                 */
                this.signals = {
                    destroy: new tsUtils.Signal()
                };
                /**
                 * @type {string}
                 */
                this.cid = tsUtils.uniqueId('base');
            }

            /**
             * Method for listen outside event emitters like i18next or jQuery
             * @param {{on: function, off: function}} emitter
             * @param {string} event
             * @param {function} handler
             */
            listenEventEmitter(emitter, event, handler) {
                if (!this.__emitterListeners[event]) {
                    this.__emitterListeners[event] = [];
                }
                this.__emitterListeners[event].push({ emitter, handler });
                emitter.on(event, handler);
            }

            /**
             * @param {string} [event]
             * @param {function} [handler]
             * @param {{on: function, off: function}} [emitter]
             * @return {null}
             */
            stopListenEventEmitter(...args) {
                let event, handler, emitter;

                if (args[0] && typeof args[0] === 'object') {
                    event = null;
                    handler = null;
                    emitter = args[0];
                } else if (args[0] && typeof args[0] === 'function') {
                    event = null;
                    handler = args[0];
                    emitter = null;
                } else {
                    event = args[0];
                }

                if (args[1] && typeof args[1] === 'object') {
                    emitter = args[1];
                } else {
                    handler = args[1];
                }

                if (args[2]) {
                    emitter = args[2];
                }

                if (!event) {
                    Object.keys(this.__emitterListeners).forEach((myEvent) => {
                        this.stopListenEventEmitter(myEvent, handler, emitter);
                    });
                    return null;
                }
                if (!handler) {
                    this.__emitterListeners[event].slice().forEach((data) => {
                        this.stopListenEventEmitter(event, data.handler, emitter);
                    });
                    return null;
                }
                this.__emitterListeners[event] = this.__emitterListeners[event].filter((data) => {
                    if (emitter) {
                        if (data.emitter === emitter && data.handler === handler) {
                            emitter.off(event, handler);
                            return false;
                        } else {
                            return true;
                        }
                    } else if (data.handler === handler) {
                        data.emitter.off(event, handler);
                        return false;
                    } else {
                        return true;
                    }
                });
            }

            /**
             * @param {string[]|string} keys
             * @param callback
             * @param {object} [options]
             * @param {Function} [options.set]
             */
            observe(keys, callback, options) {
                this.receive(utils.observe(this, keys, options), callback, this);
            }

            /**
             * @param {string[]|string} keys
             * @param callback
             * @param {object} [options]
             * @param {Function} [options.set]
             */
            observeOnce(keys, callback, options) {
                this.receiveOnce(utils.observe(this, keys, options), callback, this);
            }

            stopObserve(keys, handler) {
                this.stopReceive(utils.observe(this, keys), handler);
            }

            /**
             * @param {object} syncObject
             * @return {void}
             */
            syncSettings(syncObject) {
                return Object.keys(syncObject)
                    .forEach((name) => {
                        const settingsPath = syncObject[name];

                        this.observe(name, () => {
                            user.setSetting(settingsPath, this[name]);
                        });

                        if (user.changeSetting) {
                            this.receive(user.changeSetting, (path) => {
                                if (path === settingsPath) {
                                    this[name] = user.getSetting(path);
                                }
                            });
                        }

                        this[name] = user.getSetting(settingsPath);
                    });
            }

            $onDestroy() {
                this.signals.destroy.dispatch();
                this.stopReceive();
                this.signals.destroy.off();
                this.stopListenEventEmitter();
            }

        }

        /**
         * @access protected
         * @type {*|<T, R>(signal: Signal<T>, handler: Signal.IHandler<T, R>, context?: R) => void}
         */
        Base.prototype.receive = tsUtils.Receiver.prototype.receive;
        /**
         * @access protected
         * @type {*|<T, R>(signal: Signal<T>, handler: Signal.IHandler<T, R>, context?: R) => void}
         */
        Base.prototype.receiveOnce = tsUtils.Receiver.prototype.receiveOnce;
        /**
         * @access protected
         * @type {*|((item?: TStopArg1, handler?: Signal.IHandler<any, any>) => void)}
         */
        Base.prototype.stopReceive = tsUtils.Receiver.prototype.stopReceive;

        return Base;
    };

    factory.$inject = ['user', 'utils'];

    angular.module('app.utils')
        .factory('Base', factory);
})();

/**
 * @typedef {object} IBaseSignals
 * @property {Signal} destroy
 */
