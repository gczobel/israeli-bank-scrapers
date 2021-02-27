import moment, { Moment } from 'moment';

export default function getAllMonthMoments(startMoment: Moment | string, endMoment: Moment | string) {
  let monthMoment = moment(startMoment).startOf('month');

  const allMonths: Moment[] = [];

  while (monthMoment.isSameOrBefore(endMoment)) {
    allMonths.push(monthMoment);
    monthMoment = moment(monthMoment).add(1, 'month');
  }

  return allMonths;
}

export function getAllMonthMoments2(startMoment: Moment | string, includeNext: boolean) {
  let monthMoment = moment(startMoment).startOf('month');

  const allMonths: Moment[] = [];
  let lastMonth = moment().startOf('month');
  if (includeNext) {
    lastMonth = lastMonth.add(1, 'month');
    lastMonth = lastMonth.add(1, 'month');
    lastMonth = lastMonth.add(1, 'month');
    lastMonth = lastMonth.add(1, 'month');
  }
  while (monthMoment.isSameOrBefore(lastMonth)) {
    allMonths.push(monthMoment);
    monthMoment = moment(monthMoment).add(1, 'month');
  }

  return allMonths;
}
