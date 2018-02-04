export type LateResolvedMessage = () => string;

/**
 * Definition of a trivial logger.
 */
export interface Logger {
    warn(message: LateResolvedMessage);
    debug(message: LateResolvedMessage);
}

export function createLogger(warnings: boolean, debug: boolean): Logger {
    // for fun and giggles, lets do this the hard way instead of simply creating a class

    const warnFunc = !!warnings ? (message: LateResolvedMessage) => {
        console.log(message());
    } : (message: LateResolvedMessage) => { };

    const debugFunc = !!debug ? (message: LateResolvedMessage) => {
        console.log('[soap-graphql-debug] ' + message());
    } : (message: LateResolvedMessage) => { };

    return {
        warn: warnFunc,
        debug: debugFunc,
    };
}
