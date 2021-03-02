import fetch from 'node-fetch';
import moment from 'moment';
import datetimeDifference from 'datetime-difference';
import { getConfigValue } from './config';

export function getRndInteger(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getCurrentTime(unix = false): number {
	if (!unix) {
		return Math.floor(Date.now() / 1000);
	} else {
		return Date.now();
	}
}

export function format_number(num: number): string {
	return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

export function escape_regex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function explode(str: string, sep: string, limit: number): string[] {
	const array = str.split(sep);
	if (limit !== undefined && array.length >= limit) {
		array.push(array.splice(limit - 1).join(sep));
	}
	return array;
}

export function time_elapsed_string(datetime: string): string {
	const liveAt = new Date(moment(datetime).format('MM/DD/YYYY, hh:mm:ss A'));
	const timeNow = new Date();

	const diff = datetimeDifference(liveAt, timeNow);

	const string = {
		years: 'year',
		months: 'month',
		weeks: 'week',
		days: 'day',
		hours: 'hour',
		minutes: 'minute',
		seconds: 'second',
		//milliseconds: 'millisecond'
	};

	const finishedString = [];

	Object.keys(string).forEach(function(key) {
		// do something with string[key]
		if (diff[key] > 1) {
			string[key] = diff[key] + ' ' + string[key] + 's';
			finishedString.push(string[key]);
		} else if (diff[key] == 1) {
			string[key] = diff[key] + ' ' + string[key];
			finishedString.push(string[key]);
		} else {
			delete string[key];
		}
	});

	const actuallyFinish = finishedString.join(', ');

	return actuallyFinish;
}

export function formatNumber(num: number): string {
	return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

/**
 * Fetch json from URL.
 * @param {string} url URL String
 */
export const jsonFetch = (url: string): Promise<any> =>
	fetch(url, {
		method: 'GET',
		headers: {
			Authorization: 'Bearer ' + getConfigValue('JWT_SECRET'),
		},
	}).then(async (res) => res.json());
