import { connect } from 'react-redux'
import React, { Component } from 'react'

import { join } from 'path-extra'

import { 
  mkFleetInfoSelector,
  combinedFlagSelector,
  reduxSelector,
} from './selectors'
import { FleetPicker } from './FleetPicker'
import { ExpeditionViewer } from './ExpeditionViewer'
import { ExpeditionTable } from './ExpeditionTable'
import { RequirementViewer } from './RequirementViewer'

import {
  Panel,
} from 'react-bootstrap'

import {
  findChangingFleet,
  findNextAvailableFleet,
  isSendingFleetToExped,
} from './auto-switch'

import { reducer, mapDispatchToProps } from './reducer'

/*

   TODO

   - i18n

   TODO (non-urgent)

   - utilize React PropTypes

 */

class EZExpedMain extends Component {
  constructor() {
    super()
    this.state = {
      expedGridExpanded: false,
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.redux.config.autoSwitch) {
      const changingFleetInd = findChangingFleet(
        this.props.fleets,
        nextProps.fleets)

      if (changingFleetInd !== false) {
        this.props.onChangeFleet( changingFleetInd )
      }

      if (isSendingFleetToExped(
        this.props.fleetsExtra,
        nextProps.fleetsExtra,
        nextProps.combinedFlag)) {
        this.props.onChangeFleet( 
          findNextAvailableFleet(
            nextProps.fleetsExtra,
            nextProps.combinedFlag))
      }
    }
  }

  componentDidMount() {
    this.__eventListener = this.handleGameResponse.bind(this)
    window.addEventListener(
      'game.response', 
      this.__eventListener)
  }

  componentWillUnmount() {
    if (typeof this.__eventListener !== "undefined") {
      window.removeEventListener(
        'game.response',
        this.__eventListener)
      delete this.__eventListener
    }
  }

  handleGameResponse(e) {
    const path = e.detail.path
    if (this.props.redux.config.autoSwitch) {
      if (path === "/kcsapi/api_get_member/mission") {
        const nxt = findNextAvailableFleet(
          this.props.fleetsExtra,
          this.props.combinedFlag)
        this.props.onChangeFleet( nxt )
      }
    }
  }
  
  render() {
    const config = this.props.redux.config
    const fleetId = this.props.redux.fleetId
    const expedId = config.selectedExpeds[fleetId]
    const gsFlag = config.gsFlags[expedId]
    const fleet = this.props.fleets[ fleetId ]
    return (
      <div className="poi-plugin-ezexped">
        <link rel="stylesheet" href={join(__dirname, 'assets', 'ezexped.css')} />
        <div style={{paddingRight: "5px", paddingLeft: "5px"}}>
          <FleetPicker
              fleets={this.props.fleets}
              fleetsExtra={this.props.fleetsExtra}
              fleetId={fleetId}
              config={config}
              combinedFlag={this.props.combinedFlag}
              autoSwitch={config.autoSwitch}
              onToggleAutoSwitch={() =>
                this.props.onModifyConfig( config => ({
                  ...config,
                  autoSwitch: !config.autoSwitch,
                }))}
              onSelectFleet={this.props.onChangeFleet} />
          <ExpeditionViewer
              expedId={expedId}
              fleet={fleet}
              greatSuccess={gsFlag}
              onClickExped={() => 
                this.setState({expedGridExpanded: !this.state.expedGridExpanded})}
              onClickGS={() =>
                this.props.onModifyConfig( config => {
                  const newConfig = { ... config }
                  newConfig.gsFlags = [ ... config.gsFlags ]
                  newConfig.gsFlags[expedId] = !config.gsFlags[expedId]
                  return newConfig
                })} />
          <Panel collapsible expanded={this.state.expedGridExpanded} style={{marginBottom: "5px"}} >
            <ExpeditionTable
                fleet={fleet}
                expedId={expedId}
                onSelectExped={newExpedId => {
                  this.setState({ expedGridExpanded: false })
                  this.props.onModifyConfig( config => {
                    const newConfig = { ... config }
                    newConfig.selectedExpeds = [ ... config.selectedExpeds ]
                    newConfig.selectedExpeds[fleetId] = newExpedId
                    return newConfig
                  })}} />
          </Panel>
          <RequirementViewer
              fleet={fleet}
              expedId={expedId}
              greatSuccess={gsFlag}
          />
        </div>
      </div>
    )
  }
}

const reactClass = connect(
  (state, props) => {
    const combinedFlag = combinedFlagSelector(state)
    const fleets = []
    const fleetsExtra = [];

    [0,1,2,3].map( fleetId => {
      const {fleet,fleetExtra} = mkFleetInfoSelector(fleetId)(state)
      fleets[fleetId] = fleet
      fleetsExtra[fleetId] = fleetExtra
    })

    const redux = reduxSelector(state)
    return { fleets, fleetsExtra, combinedFlag, redux }
  },
  mapDispatchToProps)(EZExpedMain)

export { 
  reactClass,
  reducer,
}
