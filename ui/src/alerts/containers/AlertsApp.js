import React, {PropTypes} from 'react'
import SourceIndicator from '../../shared/components/SourceIndicator'
import AlertsTable from '../components/AlertsTable'
import NoKapacitorError from '../../shared/components/NoKapacitorError'
import CustomTimeRange from '../../shared/components/CustomTimeRange'

import {getAlerts} from '../apis'
import AJAX from 'utils/ajax'

import _ from 'lodash'
import moment from 'moment'

const AlertsApp = React.createClass({
  propTypes: {
    source: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string, // 'influx-enterprise'
      links: PropTypes.shape({
        proxy: PropTypes.string.isRequired,
      }).isRequired,
    }), // .isRequired,
    addFlashMessage: PropTypes.func, // .isRequired,
  },

  getInitialState() {
    return {
      loading: true,
      hasKapacitor: false,
      alerts: [],
      isTimeOpen: false,
      timeRange: {
        upper: moment().format(),
        lower: moment().subtract(1, 'h').format(),
      },
    }
  },
  // TODO: show a loading screen until we figure out if there is a kapacitor and fetch the alerts
  componentDidMount() {
    const {source} = this.props
    AJAX({
      url: source.links.kapacitors,
      method: 'GET',
    }).then(({data}) => {
      if (data.kapacitors[0]) {
        this.setState({hasKapacitor: true})

        this.fetchAlerts()
      } else {
        this.setState({loading: false})
      }
    })
  },

  fetchAlerts() {
    getAlerts(this.props.source.links.proxy, this.state.timeRange).then((resp) => {
      const results = [];
      const alertSeries = _.get(resp, ['data', 'results', '0', 'series'], [])
      if (alertSeries.length === 0) {
        this.setState({loading: false, alerts: []})
        return
      }

      const timeIndex = alertSeries[0].columns.findIndex((col) => col === 'time')
      const hostIndex = alertSeries[0].columns.findIndex((col) => col === 'host')
      const valueIndex = alertSeries[0].columns.findIndex((col) => col === 'value')
      const levelIndex = alertSeries[0].columns.findIndex((col) => col === 'level')
      const nameIndex = alertSeries[0].columns.findIndex((col) => col === 'alertName')

      alertSeries[0].values.forEach((s) => {
        results.push({
          time: `${s[timeIndex]}`,
          host: s[hostIndex],
          value: `${s[valueIndex]}`,
          level: s[levelIndex],
          name: `${s[nameIndex]}`,
        })
      })
      this.setState({loading: false, alerts: results})
    })
  },

  renderSubComponents() {
    let component
    if (this.state.loading) {
      component = (<p>Loading...</p>)
    } else {
      const {source} = this.props
      if (this.state.hasKapacitor) {
        component = (
          <AlertsTable source={source} alerts={this.state.alerts} />
        )
      } else {
        component = <NoKapacitorError source={source} />
      }
    }
    return component
  },

  handleToggleTime() {
    this.setState({isTimeOpen: !this.state.isTimeOpen})
  },

  handleCloseTime() {
    this.setState({isTimeOpen: false})
  },

  render() {
    const {source} = this.props
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-header__container">
            <div className="page-header__left">
              <h1>
                Alert History
              </h1>
            </div>
            <div className="page-header__right">
              <SourceIndicator sourceName={source.name} />
              <CustomTimeRange
                isVisible={this.state.isTimeOpen}
                onToggle={this.handleToggleTime}
                onClose={this.handleCloseTime}
                onApplyTimeRange={(timeRange) => console.log(timeRange)}
                timeRange={{upper: null, lower: null}}
              />
            </div>
          </div>
        </div>
        <div className="page-contents">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-12">
                { this.renderSubComponents() }
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },

})

export default AlertsApp
