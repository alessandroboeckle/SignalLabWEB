// Template for generating realistic Stadler LOGDATA test files, modeled on
// a real "Brake_Resisitor_Powermeasure" measurement (METRO Merseytravel).
//
// BRAKE_LOGITEM_LINES are the *exact* LOGITEM header lines from that file
// (name, type, description incl. [unit: X]/[min: X]/[max: X]/[factor ...]),
// so a generated file's header section is indistinguishable from a real one.
//
// BRAKE_SIGNALS maps each of those signals to a generation "profile" that
// mimics how it actually behaved in the real recording (which bogies are
// wired up vs. always-zero, slow temperature drift, noisy DC-link voltage,
// energy counters that barely move, a speed profile that starts inactive
// and later reports real values, etc.) — see messtoolTestGenerator.js for
// what each profile name actually does.

export const BRAKE_LOGRESOURCE_NAME =
  "METRO Merseytravel / Vehicle 10 / Brake_Resisitor_Powermeasure";

export const BRAKE_LOGITEM_LINES = [
  "LOGITEM;IITCU_A.rP_VLU;;REAL;[] Actual power dissipated in Brake resistor [max: 6553.5] [min: 0] [factor CAN->LT: 0.1] [unit: kW];;CHECKED;-1",
  "LOGITEM;IITCU_A.rTempVLU1;;REAL;[] Temperature of braking resistor (calculated). Not sent for CC750_092A04 (car B) [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: \u00b0C];;CHECKED;-1",
  "LOGITEM;IITCU_A.rUD;;REAL;[] DC-link voltage [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: V];;CHECKED;-1",
  "LOGITEM;IITCU_A.rUL;;REAL;[] Line voltage measured on the TCU input circuit [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: V];;CHECKED;-1",
  "LOGITEM;IITCU_A.uiE_VLU;;UINT;[] Energy dissipated in braking resistor [max: 65535] [min: 0] [factor CAN->LT: 1] [unit: kWh];;CHECKED;-1",
  "LOGITEM;IITCU_B.rP_VLU;;REAL;[] Actual power dissipated in Brake resistor [max: 6553.5] [min: 0] [factor CAN->LT: 0.1] [unit: kW];;CHECKED;-1",
  "LOGITEM;IITCU_B.rTempVLU1;;REAL;[] Temperature of braking resistor (calculated). Not sent for CC750_092A04 (car B) [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: \u00b0C];;CHECKED;-1",
  "LOGITEM;IITCU_B.rUD;;REAL;[] DC-link voltage [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: V];;CHECKED;-1",
  "LOGITEM;IITCU_B.rUL;;REAL;[] Line voltage measured on the TCU input circuit [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: V];;CHECKED;-1",
  "LOGITEM;IITCU_B.uiE_VLU;;UINT;[] Energy dissipated in braking resistor [max: 65535] [min: 0] [factor CAN->LT: 1] [unit: kWh];;CHECKED;-1",
  "LOGITEM;IITCU_C.rP_AUX_in;;REAL;[] Input power of auxiliary inverter [max: 327.67] [min: -327.68] [factor CAN->LT: 0.01] [unit: kW];;CHECKED;-1",
  "LOGITEM;IITCU_C.rP_AUX_out;;REAL;[] Output power of auxiliary inverter [max: 327.67] [min: -327.68] [factor CAN->LT: 0.01] [unit: kW];;CHECKED;-1",
  "LOGITEM;IITCU_C.rP_VLU;;REAL;[] Actual power dissipated in Brake resistor [max: 6553.5] [min: 0] [factor CAN->LT: 0.1] [unit: kW];;CHECKED;-1",
  "LOGITEM;IITCU_C.rTempVLU1;;REAL;[] Temperature of braking resistor (calculated). Not sent for CC750_092A04 (car B) [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: \u00b0C];;CHECKED;-1",
  "LOGITEM;IITCU_C.rUD;;REAL;[] DC-link voltage [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: V];;CHECKED;-1",
  "LOGITEM;IITCU_C.rUL;;REAL;[] Line voltage measured on the TCU input circuit [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: V];;CHECKED;-1",
  "LOGITEM;IITCU_C.uiE_VLU;;UINT;[] Energy dissipated in braking resistor [max: 65535] [min: 0] [factor CAN->LT: 1] [unit: kWh];;CHECKED;-1",
  "LOGITEM;IITCU_D.rP_AUX_in;;REAL;[] Input power of auxiliary inverter [max: 327.67] [min: -327.68] [factor CAN->LT: 0.01] [unit: kW];;CHECKED;-1",
  "LOGITEM;IITCU_D.rP_AUX_out;;REAL;[] Output power of auxiliary inverter [max: 327.67] [min: -327.68] [factor CAN->LT: 0.01] [unit: kW];;CHECKED;-1",
  "LOGITEM;IITCU_D.rP_VLU;;REAL;[] Actual power dissipated in Brake resistor [max: 6553.5] [min: 0] [factor CAN->LT: 0.1] [unit: kW];;CHECKED;-1",
  "LOGITEM;IITCU_D.rTempVLU1;;REAL;[] Temperature of braking resistor (calculated). Not sent for CC750_092A04 (car B) [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: \u00b0C];;CHECKED;-1",
  "LOGITEM;IITCU_D.rUD;;REAL;[] DC-link voltage [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: V];;CHECKED;-1",
  "LOGITEM;IITCU_D.rUL;;REAL;[] Line voltage measured on the TCU input circuit [max: 3276.7] [min: -3276.8] [factor CAN->LT: 0.1] [unit: V];;CHECKED;-1",
  "LOGITEM;IITCU_D.uiE_VLU;;UINT;[] Energy dissipated in braking resistor [max: 65535] [min: 0] [factor CAN->LT: 1] [unit: kWh];;CHECKED;-1",
  "LOGITEM;PRO.R_T1MCEFF;;REAL;[] TCU1 effort performed (kN);;CHECKED;-1",
  "LOGITEM;PRO.R_T1MCEFFRQ;;REAL;[] TCU1 effort requested (kN);;CHECKED;-1",
  "LOGITEM;PRO.R_T2MCEFF;;REAL;[] TCU2 effort performed (kN);;CHECKED;-1",
  "LOGITEM;PRO.R_T2MCEFFRQ;;REAL;[] TCU2 effort requested (kN);;CHECKED;-1",
  "LOGITEM;PRO.R_T3MCEFF;;REAL;[] TCU3 effort performed (kN);;CHECKED;-1",
  "LOGITEM;PRO.R_T3MCEFFRQ;;REAL;[] TCU3 effort requested (kN);;CHECKED;-1",
  "LOGITEM;SPD.R_TRAMSPD;;REAL;[] Vehicle speed filtered (km/h);;CHECKED;-1",
  "LOGITEM;SPD.R_TRAMSPD_MPH;;REAL;[] Vehicle speed filtered (mph);;CHECKED;-1",
  "LOGITEM;SPD.R_VHCL_ACC;;REAL;[] Vehicle acceleration;;CHECKED;-1",
  "LOGITEM;ZV.R_VehicleSpeed;;REAL;[] [km/h] Reference Speed;;CHECKED;-1",
  "LOGITEM;RECORDING_ENABLED;;BOOL;internes Recording Enabled Signal des Datalogger;;UNCHECKED;-1",
];

// One entry per LOGITEM line above, in the same order (used to drive the
// value generator). `profile` names are interpreted by messtoolTestGenerator.js.
export const BRAKE_SIGNALS = [
  { name: "IITCU_A.rP_VLU", profile: "brakePower" },
  { name: "IITCU_A.rTempVLU1", profile: "tempDrift", base: 29.2, driftTo: 47 },
  { name: "IITCU_A.rUD", profile: "voltage", base: 803 },
  { name: "IITCU_A.rUL", profile: "voltage", base: 801 },
  { name: "IITCU_A.uiE_VLU", profile: "counter", base: 10046 },

  { name: "IITCU_B.rP_VLU", profile: "zero" },
  { name: "IITCU_B.rTempVLU1", profile: "zero" },
  { name: "IITCU_B.rUD", profile: "zero" },
  { name: "IITCU_B.rUL", profile: "zero" },
  { name: "IITCU_B.uiE_VLU", profile: "zero" },

  { name: "IITCU_C.rP_AUX_in", profile: "randomWalk", base: 16, min: 0, max: 30 },
  { name: "IITCU_C.rP_AUX_out", profile: "randomWalk", base: 15, min: 0, max: 30 },
  { name: "IITCU_C.rP_VLU", profile: "brakePower" },
  { name: "IITCU_C.rTempVLU1", profile: "tempDrift", base: 30.9, driftTo: 69.8 },
  { name: "IITCU_C.rUD", profile: "voltage", base: 802 },
  { name: "IITCU_C.rUL", profile: "voltage", base: 798 },
  { name: "IITCU_C.uiE_VLU", profile: "counter", base: 46 },

  { name: "IITCU_D.rP_AUX_in", profile: "randomWalk", base: 10, min: 0, max: 30 },
  { name: "IITCU_D.rP_AUX_out", profile: "randomWalk", base: 10, min: 0, max: 30 },
  { name: "IITCU_D.rP_VLU", profile: "brakePower" },
  { name: "IITCU_D.rTempVLU1", profile: "tempDrift", base: 30.5, driftTo: 78.9 },
  { name: "IITCU_D.rUD", profile: "voltage", base: 803 },
  { name: "IITCU_D.rUL", profile: "voltage", base: 805 },
  { name: "IITCU_D.uiE_VLU", profile: "counter", base: 10790 },

  { name: "PRO.R_T1MCEFF", profile: "effort" },
  { name: "PRO.R_T1MCEFFRQ", profile: "effort" },
  { name: "PRO.R_T2MCEFF", profile: "effort" },
  { name: "PRO.R_T2MCEFFRQ", profile: "effort" },
  { name: "PRO.R_T3MCEFF", profile: "effort" },
  { name: "PRO.R_T3MCEFFRQ", profile: "effort" },

  { name: "SPD.R_TRAMSPD", profile: "speedKmh" },
  { name: "SPD.R_TRAMSPD_MPH", profile: "speedMph" },
  { name: "SPD.R_VHCL_ACC", profile: "accel" },
  { name: "ZV.R_VehicleSpeed", profile: "speedSentinel" },

  { name: "RECORDING_ENABLED", profile: "boolTrue" },
];
