import { describe, it, expect } from 'vitest';
import { locationFlowReducer, LocationFlowState, LocationFlowEvent } from './app';
import { City } from './types/location';

const AUSTIN: City = {
  id: 'tx-aus',
  displayName: 'Austin',
  region: 'South',
  state: 'TX',
  coordinates: { lat: 30, lng: -97 }
};

describe('V2 Project Scaffold', () => {
  it('should verify the testing environment is set up', () => {
    const app = document.createElement('div');
    app.id = 'app';
    document.body.appendChild(app);
    expect(document.getElementById('app')).not.toBeNull();
  });
});

describe('LocationFlow State Machine', () => {
  it('should transition from detecting to confirming on detection_complete', () => {
    const initialState: LocationFlowState = { kind: 'detecting' };
    const event: LocationFlowEvent = { type: 'detection_complete', city: AUSTIN };
    
    const nextState = locationFlowReducer(initialState, event);
    expect(nextState).toEqual({ kind: 'confirming', detectedCity: AUSTIN });
  });

  it('should transition from confirming to complete on confirm_detected', () => {
    const initialState: LocationFlowState = { kind: 'confirming', detectedCity: AUSTIN };
    const event: LocationFlowEvent = { type: 'confirm_detected' };
    
    const nextState = locationFlowReducer(initialState, event);
    expect(nextState).toEqual({ kind: 'complete', selectedCity: AUSTIN });
  });

  it('should transition from confirming to picking on reject_detected', () => {
    const initialState: LocationFlowState = { kind: 'confirming', detectedCity: AUSTIN };
    const event: LocationFlowEvent = { type: 'reject_detected' };
    
    const nextState = locationFlowReducer(initialState, event);
    expect(nextState).toEqual({ kind: 'picking', query: '', selectedIndex: 0 });
  });

  it('should transition from picking to complete on city_selected', () => {
    const initialState: LocationFlowState = { kind: 'picking', query: '', selectedIndex: 0 };
    const event: LocationFlowEvent = { type: 'city_selected', city: AUSTIN };
    
    const nextState = locationFlowReducer(initialState, event);
    expect(nextState).toEqual({ kind: 'complete', selectedCity: AUSTIN });
  });
});
