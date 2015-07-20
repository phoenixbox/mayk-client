// Libs
let _ = require('lodash')
let moment = require('moment');
import d3 from 'd3';
import React from 'react/addons';

// Services
import CalHeatMap from '../../services/cal-heatmap.js'

var CommitChart = React.createClass({

  propTypes: {
    data: React.PropTypes.array.isRequired,
    isLoading: React.PropTypes.bool.isRequired
  },

  formatWeeksForCalendar() {
    var data =  _.chain(this.props.data)
                  .map((repoData) => {
                    return internals.extractCommitData(repoData)
                  })
                  .flatten()
                  .compact()
                  .value()

    let formatted = internals.accumulateCommits(data);

    return formatted
  },

  formatCommitActivity() {
    return internals.activityForCalendar(this.props.data);
  },

  formatIndividualCommitActivity() {
    return internals.commitsForCalendar(this.props.data);
  },

  generateMap() {
    var calendar = new CalHeatMap();
    let scale = _.range(0, 100, 5);
    // let data = this.formatCommitActivity();
    let data = this.formatIndividualCommitActivity();
    let lastYear = moment().subtract(1, 'year').unix()*1000;

    calendar.init({
      itemSelector: "#replaceable-container",
      weekStartOnMonday: false,
      data: data,
      start: lastYear,
      domain: "month",
      subDomain: "day",
      range: 13,
      cellsize: 15,
	    cellpadding: 2,
      legend: [0,10,20,30,40],
      legendHorizontalPosition: "right",
      tooltip: true,
      onHover: function() {
        console.log('HOVERING');
      },
      onClick: function(date, nb) {
        console.log('ARGUMENTS: ', arguments);
        console.log('NB: ', nb);
        // pump this back up through state mgmt
    	}
    });
  },

  componentWillReceiveProps() {
    var commitChart = document.getElementById('cal-heatmap');

    if (commitChart && !_.isEmpty(this.props.data) && !this.props.isLoading) {
      var container = document.getElementById('replaceable-container');

      while (container.firstChild) {
        console.log('**** REMOVE CONTENTS');
        container.removeChild(container.firstChild);
      }

      this.generateMap();
    }
  },

  render: function() {
    return (
      <div></div>
    );
  }
});

module.exports.CommitGraph = CommitChart

let internals = {
  /*
    * 1 format individual commits
    * 2 format repo commit_activity
  */
  commitsForCalendar(commits) {
    var groups = _.groupBy(commits, 'date');

    return _.reduce(groups, function(result, val, key) {
      let timeKey = moment(key).unix();

      result[timeKey] = val.length;
      return result;
    },{})
  },

  activityForCalendar(activity) {
    // moment(1336280400*1000).add(1, 'days').unix()
    let repoStats = internals.gatherRepoStats(activity);
    let groupedWeekActivity = internals.groupWeekActivity(repoStats);
    let weeklyData = internals.buildWeeklyData(groupedWeekActivity);

    return internals.mergeWeeklyData(weeklyData);
  },

  // **** data massaging functions ****

  buildWeeklyData(weekData) {
    return _.chain(weekData)
      .reduce((result, daysVal, timeKey, i) => {

        let times = internals.timestampIncrements(daysVal, timeKey);

        return result.concat(times);
      }, [])
      .flatten()
      .value();
  },

  mergeWeeklyData(weeklyData) {
    return _.reduce(weeklyData, (result, week) => {
      result = _.merge(result, week)

      return result;
    }, {});
  },

  timestampIncrements(days, time) {
    return _.reduce(days, (result, day, index) => {
      let newTimeKey = internals.incrementTimeString(time, index);
      result[newTimeKey] = day

      return result
    }, {})
  },

  incrementTimeString(time, index) {
    return (parseInt(time) + (86400 * index)).toString();
  },

  extractCommitData(repoData) {
    return  _.chain(repoData.stats.weeks)
              .map((week) => {
                if (week.c !== 0) {
                  let formatted = {};
                  formatted[`${week.w}`] = week.c;
                  return formatted;
                }
              })
              .compact()
              .value()
  },

  gatherRepoStats(activity) {
    return _.chain(activity)
            .map((activity) => {
              return activity.stats
            })
            .flatten()
            .value();
  },

  groupWeekActivity(data) {
    let weekGroups = _.groupBy(data, 'week')

    return _.reduce(weekGroups, (result, val, key) => {
      var days = _.map(val, (v) => {
        return v.days;
      });

      result[key] = internals.accumulatedDays(days);

      return result
    }, {})
  },

  accumulatedDays(days) {
    return _.reduce(days, (result, val) => {
      result = _.zipWith(result, val, _.add);

      return result
    }, []);
  },

  accumulateCommits(data) {
    let copy = data;

    return _.reduce(data, function(result, stat, val) {

      let statKey = _.keys(stat)[0];
      if (result[statKey]) {
        return result
      }

      let values = _.chain(copy)
                    .pluck(statKey)
                    .compact()
                    .reduce(function(result, value) {
                      return result += value;
                    },0)
                    .value();

      result[statKey] = values;

      return result
    }, {})
  }
}

module.exports.internals = internals
