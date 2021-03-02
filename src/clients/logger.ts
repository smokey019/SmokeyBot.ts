import log4js from 'log4js';
import { getConfigValue } from '../config';

log4js.configure({
	appenders: {
		out: {
			type: 'stdout', layout: {
				type: 'pattern',
				pattern: '%[[%d{MM/dd/yyyy - hh:mm:ss.SSS}] [%p] [%c]%] - %m%n'
			}
		}
	},
	categories: { default: { appenders: ['out'], level: 'info' } }
});

const loggers: { [category: string]: log4js.Logger } = {};

const defaultLogger = '$default';

export function getLogger(category = defaultLogger): log4js.Logger {
  if (!loggers[category]) {
    loggers[category] = log4js.getLogger(
      category === defaultLogger ? undefined : category,
    );

    loggers[category].level = getConfigValue('LOG_LEVEL') || 'OFF';
  }

  return loggers[category];
}
