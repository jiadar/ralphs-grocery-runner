import { useState } from "react";

const PHASES = [
  { id: "pre", label: "Pre-Flight", color: "#6B7280", dates: "May 8-13" },
  { id: "naic1", label: "Arrival + Naic", color: "#059669", dates: "May 14-17" },
  { id: "islands", label: "Islands", color: "#0891B2", dates: "May 18-25" },
  { id: "bjj", label: "BJJ Block", color: "#D97706", dates: "May 26-31" },
  { id: "shanghai", label: "Shanghai", color: "#DC2626", dates: "Jun 1-10" },
  { id: "post", label: "Returns", color: "#7C3AED", dates: "Jun 10-19" },
];
const PP = {
  javin: { name: "Javin", color: "#059669", icon: "🟢" },
  jhoed: { name: "Jhoed", color: "#DC2626", icon: "🔴" },
  nick: { name: "Nick", color: "#0891B2", icon: "🔵" },
  cody: { name: "Cody", color: "#D97706", icon: "🟠" },
};

const DAYS = [
  // ===== PRE-FLIGHT =====
  {date:"May 8",dow:"Fri",phase:"pre",location:"San Diego",people:["javin"],protocol:"Ramp Day 1",schedule:[
    {time:"7:00am",item:"Wake"},{time:"7:30am",item:"Breakfast",who:["javin"]},{time:"12:00pm",item:"Lunch",who:["javin"]},{time:"6:00pm",item:"Dinner",who:["javin"]},{time:"10:00pm",item:"Melatonin 0.5mg. Bed.",who:["javin"]}
  ],sleep:{javin:"10:00pm-7:00am (9hrs)"},notes:"Seek light 7am-1pm. Avoid light before 7am."},

  {date:"May 9",dow:"Sat",phase:"pre",location:"San Diego",people:["javin"],protocol:"Ramp Day 2",schedule:[
    {time:"8:30am",item:"Wake"},{time:"9:00am",item:"Breakfast",who:["javin"]},{time:"1:30pm",item:"Lunch",who:["javin"]},{time:"7:30pm",item:"Dinner",who:["javin"]},{time:"11:30pm",item:"Melatonin 0.5mg. Bed.",who:["javin"]}
  ],sleep:{javin:"11:30pm-8:30am (9hrs)"},notes:"Seek light 8:30am-2:30pm."},

  {date:"May 10",dow:"Sun",phase:"pre",location:"San Diego",people:["javin"],protocol:"Ramp Day 3",schedule:[
    {time:"10:00am",item:"Wake"},{time:"10:30am",item:"Breakfast",who:["javin"]},{time:"3:00pm",item:"Lunch",who:["javin"]},{time:"9:00pm",item:"Dinner",who:["javin"]},{time:"1:00am",item:"Melatonin 0.5mg. Bed.",who:["javin"]}
  ],sleep:{javin:"1:00am-10:00am (9hrs)"},notes:"Seek light 10am-4pm."},

  {date:"May 11",dow:"Mon",phase:"pre",location:"San Diego",people:["javin"],protocol:"Ramp Day 4",schedule:[
    {time:"11:30am",item:"Wake"},{time:"12:00pm",item:"Breakfast",who:["javin"]},{time:"4:30pm",item:"Lunch",who:["javin"]},{time:"10:30pm",item:"Dinner",who:["javin"]},{time:"2:30am",item:"Melatonin 0.5mg. Bed.",who:["javin"]}
  ],sleep:{javin:"2:30am-11:30am (9hrs)"},notes:"Seek light 11:30am-5:30pm."},

  {date:"May 12",dow:"Tue",phase:"pre",location:"SD -> Airport Hotel",people:["javin","jhoed"],protocol:"Ramp Day 5",schedule:[
    {time:"1:00pm",item:"Wake",who:["javin"]},{time:"1:30pm",item:"Breakfast",who:["javin"]},{time:"6:00pm",item:"Lunch",who:["javin"]},{time:"9:30pm",item:"Dinner - eat before leaving home",who:["javin"]},{time:"11:00pm",item:"Hotel check-in. 1mg melatonin. Lights out.",who:["javin"]},
    {time:"11:00pm",item:"Hotel check-in.",who:["jhoed"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"},notes:"Seek light 1pm-7pm. Body won't want to sleep until ~4am - melatonin + dark room."},

  {date:"May 13",dow:"Wed",phase:"pre",location:"LAX / SFO",people:["javin","jhoed","nick"],schedule:[
    {time:"8:00am",item:"Wake (hotel alarm)",who:["javin","jhoed"]},
    {time:"8:45am",item:"Hotel breakfast",who:["javin","jhoed"]},
    {time:"12:25pm",item:"PR 113 LAX -> MNL (14hr 35min)",tag:"flight",who:["javin","jhoed"]},
    {time:"",item:"United UA809 SFO -> MNL 1:30pm (14hr 30min)",tag:"flight",who:["nick"]}
  ],sleep:{javin:"On plane - melatonin at shifted bedtime"},notes:"Switch watch to destination time at the gate."},

  // ===== ARRIVAL + NAIC =====
  {date:"May 14",dow:"Thu",phase:"naic1",location:"MNL -> Naic",people:["javin","jhoed","nick"],protocol:"Day 1 - Critical",schedule:[
    {time:"6:00pm",item:"Land MNL",who:["javin","jhoed"]},
    {time:"6:45pm",item:"Clear immigration/baggage",who:["javin","jhoed"]},
    {time:"7:00pm",item:"Land MNL",who:["nick"]},
    {time:"7:30pm",item:"Clear immigration/baggage. Meet Javin + Jhoed.",who:["nick"]},
    {time:"7:30pm",item:"Drive MNL -> Naic (2.5-3 hrs)",tag:"transport"},
    {time:"10:00pm",item:"Arrive Naic. Dinner. 🟡",who:["javin"]},
    {time:"10:00pm",item:"Arrive Naic. Dinner.",who:["jhoed","nick"]},
    {time:"10:00pm",item:"Meeting 10pm-midnight PHT",tag:"meeting",who:["javin"]},
    {time:"1:00am",item:"Melatonin 0.5-1mg. Lights out.",who:["javin"]}
  ],sleep:{javin:"1:00am-10:00am (9hrs)"}},

  {date:"May 15",dow:"Fri",phase:"naic1",location:"Naic",people:["javin","jhoed","nick"],protocol:"Day 2 - Critical",schedule:[
    {time:"10:00am",item:"Wake",who:["javin"]},
    {time:"10:30am",item:"Breakfast",who:["javin"]},
    {time:"12:00pm",item:"Lunch",who:["javin"]},
    {time:"8:30pm",item:"Dinner 🔴",who:["javin"]},
    {time:"",item:"Dinner",who:["jhoed","nick"]},
    {time:"12:00am",item:"Melatonin. Bed. 🟡",who:["javin"]}
  ],sleep:{javin:"12:00am-9:00am (9hrs)"},
  optional:[
    {time:"5:30-9:00pm",item:"⚠️ Cavite City BJJ (if feeling good). Depart Naic 2:45pm (bus) / 3:45pm (drive) / 4:15pm (scooter). Return 11:15pm (bus/drive) / 10:45pm (scooter).",who:["javin","nick"]}
  ]},

  {date:"May 16",dow:"Sat",phase:"naic1",location:"Naic -> Imus",people:["javin","jhoed","nick"],protocol:"Day 3 - Moderate",bjj:{gym:"Comp Training",time:"1:00-3:00pm",count:"1/4",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake 🟡",who:["javin"]},
    {time:"9:30am",item:"Breakfast 🟡",who:["javin"]},
    {time:"10:30am",item:"Depart Naic -> Imus (bus 2.5 hrs)",tag:"transport",who:["javin","nick"]},
    {time:"",item:"  or 11:15am drive / 11:45am scooter",who:["javin","nick"]},
    {time:"1:00pm",item:"Arrive Comp Training",who:["javin","nick"]},
    {time:"1:00-3:00pm",item:"🤼 Comp Training (1/4)",tag:"bjj",who:["javin","nick"]},
    {time:"3:00-4:00pm",item:"Shower + chat (1 hr)",who:["javin","nick"]},
    {time:"4:00pm",item:"Depart Imus -> Naic",tag:"transport",who:["javin","nick"]},
    {time:"6:30pm",item:"Arrive Naic (bus) / 5:30pm (drive) / 5:00pm (scooter)",who:["javin","nick"]},
    {time:"",item:"Free day in Naic",who:["jhoed"]},
    {time:"8:30pm",item:"Dinner 🔴",who:["javin"]},
    {time:"12:00am",item:"Melatonin. Bed. 🟡",who:["javin"]}
  ],sleep:{javin:"12:00am-9:00am (9hrs)"}},

  {date:"May 17",dow:"Sun",phase:"naic1",location:"Naic",people:["javin","jhoed","nick"],protocol:"Day 4 - Moderate",schedule:[
    {time:"9:00am",item:"Wake 🟡",who:["javin"]},
    {time:"9:30am",item:"Breakfast 🟡",who:["javin"]},
    {time:"12:00pm",item:"Lunch"},
    {time:"",item:"Rest day."},
    {time:"8:30pm",item:"Dinner 🔴",who:["javin"]},
    {time:"12:30am",item:"Melatonin. Bed. 🟡",who:["javin"]}
  ],sleep:{javin:"12:30am-9:30am (9hrs)"}},

  // ===== ISLANDS =====
  {date:"May 18",dow:"Mon",phase:"islands",location:"Naic -> MNL -> Bohol",people:["javin","jhoed","nick"],protocol:"Day 5 - Good",bjj:{gym:"Bohol BJJ",time:"6:30-8:30pm",count:"Bohol 1/2",who:["javin","nick"]},schedule:[
    {time:"9:30am",item:"Wake 🟡",who:["javin"]},
    {time:"9:45am",item:"Breakfast to-go 🟡",who:["javin"]},
    {time:"10:00am",item:"Depart Naic -> MNL airport (2.5 hrs)",tag:"transport"},
    {time:"12:30pm",item:"Arrive MNL airport (1hr 40min early)"},
    {time:"2:10pm",item:"Zest Air Z2 358 MNL -> TAG (1hr 20min)",tag:"flight"},
    {time:"3:30pm",item:"Arrive Bohol (Panglao)"},
    {time:"4:30pm",item:"Exit airport + tuk tuk (1 hr)"},
    {time:"4:30-5:30pm",item:"Quick meal in town"},
    {time:"5:45pm",item:"Depart town -> Bohol BJJ (car 45 min)",tag:"transport",who:["javin","nick"]},
    {time:"",item:"  Bus: depart 5:00pm (1.5 hrs) - 30 min to eat 🔴",who:["javin","nick"]},
    {time:"6:30pm",item:"Arrive Bohol BJJ",who:["javin","nick"]},
    {time:"6:30-8:30pm",item:"🤼 Bohol BJJ (1/2)",tag:"bjj",who:["javin","nick"]},
    {time:"8:30-9:15pm",item:"Chit chat (45 min)",who:["javin","nick"]},
    {time:"9:15pm",item:"Depart -> town (car 45 min)",tag:"transport",who:["javin","nick"]},
    {time:"10:00pm",item:"Arrive accommodation. Shower.",who:["javin","nick"]},
    {time:"10:30pm",item:"Dinner",who:["javin"]},
    {time:"12:00am",item:"Melatonin. Bed. 🟡",who:["javin"]}
  ],sleep:{javin:"12:00am-9:00am (9hrs)"},flags:[{text:"🟡 Bus to Bohol BJJ extremely tight - car strongly recommended",who:["javin","nick"]}]},

  {date:"May 19",dow:"Tue",phase:"islands",location:"Bohol",people:["javin","jhoed","nick"],protocol:"Day 6 - Good",schedule:[
    {time:"10:00am",item:"Wake",who:["javin"]},
    {time:"10:30am",item:"Breakfast",who:["javin"]},
    {time:"12:00pm",item:"Lunch"},
    {time:"9:00pm",item:"Dinner (restaurants close 10pm) 🔴",who:["javin"]},
    {time:"9:00pm",item:"Dinner (restaurants close 10pm)",who:["jhoed","nick"]},
    {time:"10:00pm",item:"Meeting 10pm-midnight PHT",tag:"meeting",who:["javin"]},
    {time:"1:00am",item:"Melatonin. Bed.",who:["javin"]}
  ],sleep:{javin:"1:00am-10:00am (9hrs)"}},

  {date:"May 20",dow:"Wed",phase:"islands",location:"Bohol",people:["javin","jhoed","nick"],protocol:"Day 7 - Good",bjj:{gym:"Bohol BJJ",time:"6:30-8:30pm",count:"Bohol 2/2",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake 🟡",who:["javin"]},
    {time:"9:30am",item:"Breakfast 🟡",who:["javin"]},
    {time:"12:00pm",item:"Lunch"},
    {time:"4:00pm",item:"Quick meal before practice",who:["javin","nick"]},
    {time:"4:45pm",item:"Depart town -> Bohol BJJ (bus 1.5 hrs)",tag:"transport",who:["javin","nick"]},
    {time:"",item:"  or 5:30pm car 45 min",who:["javin","nick"]},
    {time:"6:15pm",item:"Arrive Bohol BJJ (15 min early)",who:["javin","nick"]},
    {time:"6:30-8:30pm",item:"🤼 Bohol BJJ (2/2)",tag:"bjj",who:["javin","nick"]},
    {time:"8:30-9:15pm",item:"Chit chat (45 min)",who:["javin","nick"]},
    {time:"9:15pm",item:"Depart -> town (car 45 min)",tag:"transport",who:["javin","nick"]},
    {time:"10:00pm",item:"Arrive town. Shower.",who:["javin","nick"]},
    {time:"10:45pm",item:"Dinner at late night schwarma shop",who:["javin","nick"]},
    {time:"12:00am",item:"Melatonin. Bed. 🟡",who:["javin"]}
  ],sleep:{javin:"12:00am-10:00am (10hrs)"}},

  {date:"May 21",dow:"Thu",phase:"islands",location:"Bohol -> El Nido",people:["javin","jhoed","nick"],protocol:"Day 8 - Good (final)",bjj:{gym:"Madness MMA",time:"6:30-7:30pm",count:"",who:["javin","nick"]},schedule:[
    {time:"10:00am",item:"Wake",who:["javin"]},
    {time:"10:30am",item:"Breakfast",who:["javin"]},
    {time:"11:00am",item:"Hotel checkout"},
    {time:"11:30am-1:00pm",item:"Lunch / beach time"},
    {time:"1:30pm",item:"Depart for Bohol airport (30 min)",tag:"transport"},
    {time:"2:00pm",item:"Arrive TAG airport (1hr 40min early)"},
    {time:"3:40pm",item:"Cebu Pacific 5J 5611 TAG -> ENI (1hr 45min)",tag:"flight"},
    {time:"5:25pm",item:"Arrive El Nido"},
    {time:"5:45pm",item:"Arrive accommodation"},
    {time:"6:00pm",item:"Depart for Madness MMA (30 min)",tag:"transport",who:["javin","nick"]},
    {time:"6:30-7:30pm",item:"🤼 Madness MMA (1hr)",tag:"bjj",who:["javin","nick"]},
    {time:"7:30pm",item:"Travel back (30 min)",tag:"transport",who:["javin","nick"]},
    {time:"8:00pm",item:"Arrive accommodation. Shower.",who:["javin","nick"]},
    {time:"8:45pm",item:"Dinner (restaurants close 9pm) 🔴",who:["javin"]},
    {time:"8:45pm",item:"Dinner (restaurants close 9pm)",who:["jhoed","nick"]},
    {time:"10:00pm",item:"Meeting 10pm-midnight PHT",tag:"meeting",who:["javin"]},
    {time:"1:00am",item:"Melatonin. Bed.",who:["javin"]}
  ],sleep:{javin:"1:00am-10:00am (9hrs)"},notes:"Jet lag protocol complete after today (Javin)."},

  {date:"May 22",dow:"Fri",phase:"islands",location:"El Nido",people:["javin","jhoed","nick"],bjj:{gym:"Madness MMA",time:"5:00-6:00pm",count:"",who:["javin","nick"]},schedule:[
    {time:"8:00am",item:"Wake"},
    {time:"8:30am",item:"Breakfast"},
    {time:"",item:"Day activities"},
    {time:"4:30pm",item:"Depart for Madness MMA (30 min)",tag:"transport",who:["javin","nick"]},
    {time:"5:00-6:00pm",item:"🤼 Madness MMA (1hr)",tag:"bjj",who:["javin","nick"]},
    {time:"6:00pm",item:"Travel back (30 min)",tag:"transport",who:["javin","nick"]},
    {time:"6:30pm",item:"Arrive accommodation. Shower.",who:["javin","nick"]},
    {time:"8:00pm",item:"Dinner (seated by 8:45pm; restaurants close 9pm)"},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"May 23",dow:"Sat",phase:"islands",location:"El Nido",people:["javin","jhoed","nick"],schedule:[
    {time:"8:00am",item:"Wake, breakfast"},
    {time:"",item:"Day activities in El Nido"},
    {time:"8:00pm",item:"Dinner (seated by 8:45pm; restaurants close 9pm)"},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"May 24",dow:"Sun",phase:"islands",location:"El Nido -> MNL -> Naic",people:["javin","jhoed","nick"],schedule:[
    {time:"8:00am",item:"Wake, breakfast"},
    {time:"",item:"Morning free in El Nido"},
    {time:"12:30pm",item:"Depart for El Nido airport",tag:"transport"},
    {time:"12:55pm",item:"Arrive ENI airport (1.5 hrs early)"},
    {time:"2:25pm",item:"AirSwift T65410 ENI -> MPH Caticlan (1hr 05min)",tag:"flight"},
    {time:"3:30pm",item:"Arrive MPH Boracay (2hr 15min connect)"},
    {time:"5:45pm",item:"PAL Express PR2044 MPH -> MNL (1hr 10min)",tag:"flight"},
    {time:"6:55pm",item:"Arrive MNL"},
    {time:"7:15pm",item:"Clear baggage"},
    {time:"7:30pm",item:"Drive MNL -> Naic (2.5-3 hrs)",tag:"transport"},
    {time:"10:00pm",item:"Arrive Naic. Dinner."},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"May 25",dow:"Mon",phase:"islands",location:"Naic -> MNL",people:["javin","jhoed","nick"],bjj:{gym:"Motion",time:"7:00-9:00pm",count:"",who:["javin","nick"]},schedule:[
    {time:"8:00am",item:"Wake, breakfast"},
    {time:"",item:"Drive Naic -> MNL (2.5-3 hrs)",tag:"transport"},
    {time:"4:30pm",item:"Dinner in BGC"},
    {time:"6:30pm",item:"Finish dinner"},
    {time:"6:45pm",item:"Walk to Motion (15 min)",tag:"transport",who:["javin","nick"]},
    {time:"7:00-9:00pm",item:"🤼 Motion 7-9pm",tag:"bjj",who:["javin","nick"]},
    {time:"9:15pm",item:"Post-class buffer (15 min)",who:["javin","nick"]},
    {time:"9:30pm",item:"Arrive MNL hotel"},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"},notes:"Everyone stays MNL hotel. Jhoed's last night before departure."},

  // ===== BJJ BLOCK =====
  {date:"May 26",dow:"Tue",phase:"bjj",location:"MNL -> Naic / Jhoed departs",people:["javin","jhoed","nick"],bjj:{gym:"KMA",time:"12:00-2:00pm",count:"",who:["javin","nick"]},schedule:[
    {time:"6:15am",item:"Jhoed leaves hotel for MNL airport",who:["jhoed"]},
    {time:"8:00am",item:"Wake",who:["javin","nick"]},
    {time:"8:30am",item:"Breakfast",who:["javin","nick"]},
    {time:"10:05am",item:"JAL JL0746 MNL -> NRT (4hr 25min)",tag:"flight",who:["jhoed"]},
    {time:"3:30pm",item:"Arrive NRT (1hr 45min connect)",who:["jhoed"]},
    {time:"5:15pm",item:"JAL JL0066 NRT -> SAN (9hr 50min)",tag:"flight",who:["jhoed"]},
    {time:"11:05am",item:"Arrive SAN same day",who:["jhoed"]},
    {time:"11:15am",item:"Depart for KMA Makati (30 min)",tag:"transport",who:["javin","nick"]},
    {time:"11:45am",item:"Arrive KMA (15 min early)",who:["javin","nick"]},
    {time:"12:00-2:00pm",item:"🤼 KMA",tag:"bjj",who:["javin","nick"]},
    {time:"2:00-2:45pm",item:"Shower + buffer",who:["javin","nick"]},
    {time:"3:00pm",item:"Depart Makati -> Naic (3 hrs)",tag:"transport",who:["javin","nick"]},
    {time:"6:00pm",item:"Arrive Naic",who:["javin","nick"]},
    {time:"8:00pm",item:"Dinner",who:["javin","nick"]},
    {time:"10:00pm",item:"Meeting 10pm-midnight PHT",tag:"meeting",who:["javin"]},
    {time:"12:00am",item:"Bed",who:["javin"]}
  ],sleep:{javin:"12:00am-9:00am (9hrs)"}},

  {date:"May 27",dow:"Wed",phase:"bjj",location:"Naic -> Imus",people:["javin","nick"],bjj:{gym:"Comp Training",time:"1:00-3:00pm",count:"2/4",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake, breakfast"},
    {time:"10:30am",item:"Depart Naic -> Imus (bus 2.5 hrs)",tag:"transport"},
    {time:"",item:"  or 11:15am drive / 11:45am scooter"},
    {time:"1:00pm",item:"Arrive Comp Training"},
    {time:"1:00-3:00pm",item:"🤼 Comp Training (2/4)",tag:"bjj"},
    {time:"3:00-4:00pm",item:"Shower + chat (1 hr)"},
    {time:"4:00pm",item:"Depart Imus -> Naic",tag:"transport"},
    {time:"6:30pm",item:"Arrive Naic (bus) / 5:30pm (drive) / 5:00pm (scooter)"},
    {time:"8:00pm",item:"Dinner"},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"May 28",dow:"Thu",phase:"bjj",location:"Naic -> Imus",people:["javin","nick"],bjj:{gym:"Comp Training",time:"1:00-3:00pm",count:"3/4",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake, breakfast"},
    {time:"10:30am",item:"Depart Naic -> Imus (bus 2.5 hrs)",tag:"transport"},
    {time:"",item:"  or 11:15am drive / 11:45am scooter"},
    {time:"1:00pm",item:"Arrive Comp Training"},
    {time:"1:00-3:00pm",item:"🤼 Comp Training (3/4)",tag:"bjj"},
    {time:"3:00-4:00pm",item:"Shower + chat (1 hr)"},
    {time:"4:00pm",item:"Depart Imus -> Naic",tag:"transport"},
    {time:"6:30pm",item:"Arrive Naic (bus) / 5:30pm (drive) / 5:00pm (scooter)"},
    {time:"8:00pm",item:"Dinner"},
    {time:"10:00pm",item:"Meeting 10pm-midnight PHT",tag:"meeting",who:["javin"]},
    {time:"12:00am",item:"Bed",who:["javin"]}
  ],sleep:{javin:"12:00am-9:00am (9hrs)"}},

  {date:"May 29",dow:"Fri",phase:"bjj",location:"Naic -> Cavite City",people:["javin","nick"],bjj:{gym:"Cavite City",time:"5:30-9:00pm",count:"",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake, breakfast"},
    {time:"12:00pm",item:"Lunch"},
    {time:"2:45pm",item:"Depart Naic -> Cavite City (bus 2.5 hrs)",tag:"transport"},
    {time:"",item:"  or 3:45pm drive / 4:15pm scooter"},
    {time:"5:15pm",item:"Arrive Cavite City (15 min early)"},
    {time:"5:30-9:00pm",item:"🤼 Cavite City BJJ",tag:"bjj"},
    {time:"9:00-9:45pm",item:"Shower + chat"},
    {time:"9:45pm",item:"Depart Cavite City -> Naic",tag:"transport"},
    {time:"11:15pm",item:"Arrive Naic (bus/drive) / 10:45pm (scooter)"},
    {time:"",item:"Dinner: eat before departing or upon arrival"},
    {time:"11:30pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:30pm-8:30am (9hrs)"}},

  {date:"May 30",dow:"Sat",phase:"bjj",location:"Naic -> Imus",people:["javin","nick"],bjj:{gym:"Comp Training",time:"1:00-3:00pm",count:"4/4",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake, breakfast"},
    {time:"10:30am",item:"Depart Naic -> Imus (bus 2.5 hrs)",tag:"transport"},
    {time:"",item:"  or 11:15am drive / 11:45am scooter"},
    {time:"1:00pm",item:"Arrive Comp Training"},
    {time:"1:00-3:00pm",item:"🤼 Comp Training (4/4)",tag:"bjj"},
    {time:"3:00-4:00pm",item:"Shower + chat (1 hr)"},
    {time:"4:00pm",item:"Depart Imus -> Naic",tag:"transport"},
    {time:"6:30pm",item:"Arrive Naic (bus) / 5:30pm (drive) / 5:00pm (scooter)"},
    {time:"8:00pm",item:"Dinner"},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"May 31",dow:"Sun",phase:"bjj",location:"Naic -> MNL / Cody departs SFO",people:["javin","nick","cody"],schedule:[
    {time:"8:00am",item:"Wake",who:["javin","nick"]},
    {time:"9:00am",item:"Breakfast. Pack for Shanghai.",who:["javin","nick"]},
    {time:"",item:"Drive Naic -> MNL (2.5-3 hrs)",tag:"transport",who:["javin","nick"]},
    {time:"1:30pm",item:"Air China CA7210 SFO -> PVG (12hr 55min)",tag:"flight",who:["cody"]},
    {time:"4:00pm",item:"Arrive MNL. Check into hotel.",who:["javin","nick"]},
    {time:"7:00pm",item:"Dinner",who:["javin","nick"]},
    {time:"10:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"10:00pm-6:30am (8.5hrs)"},notes:"MNL hotel night before Jun 1 international flight. Cody arrives PVG Shanghai 5:25pm Jun 1."},

  // ===== SHANGHAI =====
  {date:"Jun 1",dow:"Mon",phase:"shanghai",location:"MNL -> Shanghai",people:["javin","nick","cody"],schedule:[
    {time:"6:30am",item:"Wake",who:["javin","nick"]},
    {time:"7:00am",item:"Hotel breakfast",who:["javin","nick"]},
    {time:"7:30am",item:"Depart hotel -> MNL airport (30-45 min)",tag:"transport",who:["javin","nick"]},
    {time:"8:00am",item:"Arrive MNL airport (3 hrs early, international)",who:["javin","nick"]},
    {time:"10:50am",item:"PR 336 MNL -> PVG (3hr 40min)",tag:"flight",who:["javin","nick"]},
    {time:"2:30pm",item:"Arrive PVG Shanghai Pudong",who:["javin","nick"]},
    {time:"3:30pm",item:"Clear immigration. Train/taxi to city.",who:["javin","nick"],tag:"transport"},
    {time:"5:00pm",item:"Arrive accommodation",who:["javin","nick"]},
    {time:"5:25pm",item:"Arrive PVG Shanghai from SFO",who:["cody"]},
    {time:"6:30pm",item:"Cody arrives accommodation",who:["cody"]},
    {time:"7:00pm",item:"Dinner"},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"},notes:"Travel day. Shanghai is UTC+8, same as Manila."},

  {date:"Jun 2",dow:"Tue",phase:"shanghai",location:"Shanghai",people:["javin","nick","cody"],bjj:{gym:"Nomadic Grappling",time:"11am + 7pm",count:"",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake",who:["javin"]},
    {time:"9:30am",item:"Breakfast"},
    {time:"",item:"Full day in Shanghai (Day 1)"},
    {time:"11:00am-12:00pm",item:"🤼 Nomadic Grappling - Situational Class",tag:"bjj",who:["javin","nick"]},
    {time:"6:00pm",item:"Dinner"},
    {time:"7:00-8:00pm",item:"🤼 Nomadic Grappling - Advanced Nogi",tag:"bjj",who:["javin","nick"]},
    {time:"10:00pm",item:"Meeting 10pm-midnight PHT/CST",tag:"meeting",who:["javin"]},
    {time:"12:05am",item:"Bed",who:["javin"]}
  ],sleep:{javin:"12:05am-9:00am (9hrs)"}},

  {date:"Jun 3",dow:"Wed",phase:"shanghai",location:"Shanghai",people:["javin","nick","cody"],bjj:{gym:"Nomadic Grappling",time:"12pm + 8pm",count:"",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake",who:["javin"]},
    {time:"9:30am",item:"Breakfast"},
    {time:"",item:"Full day (Day 2)"},
    {time:"12:00-1:00pm",item:"🤼 Nomadic Grappling - Advanced Class",tag:"bjj",who:["javin","nick"]},
    {time:"6:00pm",item:"Dinner"},
    {time:"8:00-9:00pm",item:"🤼 Nomadic Grappling - Sparring Class",tag:"bjj",who:["javin","nick"]},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"Jun 4",dow:"Thu",phase:"shanghai",location:"Shanghai",people:["javin","nick","cody"],bjj:{gym:"Nomadic Grappling",time:"11am-1pm + 7pm",count:"",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake",who:["javin"]},
    {time:"9:30am",item:"Breakfast"},
    {time:"",item:"Full day (Day 3)"},
    {time:"11:00am-12:00pm",item:"🤼 Nomadic Grappling - Situational Class",tag:"bjj",who:["javin","nick"]},
    {time:"12:00-1:00pm",item:"🤼 Nomadic Grappling - Advanced Class Leg Lock",tag:"bjj",who:["javin","nick"]},
    {time:"6:00pm",item:"Dinner"},
    {time:"7:00-8:00pm",item:"🤼 Nomadic Grappling - All Levels Nogi",tag:"bjj",who:["javin","nick"]},
    {time:"10:00pm",item:"Meeting 10pm-midnight PHT/CST",tag:"meeting",who:["javin"]},
    {time:"12:05am",item:"Bed",who:["javin"]}
  ],sleep:{javin:"12:05am-9:00am (9hrs)"}},

  {date:"Jun 5",dow:"Fri",phase:"shanghai",location:"Shanghai",people:["javin","nick","cody"],bjj:{gym:"Nomadic Grappling",time:"12pm + 7pm",count:"",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake",who:["javin"]},
    {time:"9:30am",item:"Breakfast"},
    {time:"",item:"Full day (Day 4)"},
    {time:"12:00-1:00pm",item:"🤼 Nomadic Grappling - Advanced Class",tag:"bjj",who:["javin","nick"]},
    {time:"6:00pm",item:"Dinner"},
    {time:"7:00-8:00pm",item:"🤼 Nomadic Grappling - Advanced Nogi",tag:"bjj",who:["javin","nick"]},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"Jun 6",dow:"Sat",phase:"shanghai",location:"Shanghai",people:["javin","nick","cody"],bjj:{gym:"Nomadic Grappling",time:"12pm",count:"",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake",who:["javin"]},
    {time:"9:30am",item:"Breakfast"},
    {time:"",item:"Full day (Day 5)"},
    {time:"12:00-1:00pm",item:"🤼 Nomadic Grappling - All Levels Leg Lock Class",tag:"bjj",who:["javin","nick"]},
    {time:"8:00pm",item:"Dinner"},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"Jun 7",dow:"Sun",phase:"shanghai",location:"Shanghai",people:["javin","nick","cody"],bjj:{gym:"Nomadic Grappling",time:"11am",count:"",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake",who:["javin"]},
    {time:"9:30am",item:"Breakfast"},
    {time:"11:00am-12:00pm",item:"🤼 Nomadic Grappling - All Levels Nogi",tag:"bjj",who:["javin","nick"]},
    {time:"8:00pm",item:"Dinner"},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"Jun 8",dow:"Mon",phase:"shanghai",location:"Shanghai",people:["javin","nick","cody"],bjj:{gym:"Nomadic Grappling",time:"10am-1pm",count:"",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake",who:["javin"]},
    {time:"9:30am",item:"Breakfast"},
    {time:"",item:"Full day (Day 6). Last day together."},
    {time:"10:00am-12:00pm",item:"🤼 Nomadic Grappling - Advanced Training",tag:"bjj",who:["javin","nick"]},
    {time:"12:00-1:00pm",item:"🤼 Nomadic Grappling - Advanced Class",tag:"bjj",who:["javin","nick"]},
    {time:"8:00pm",item:"Dinner"},
    {time:"11:00pm",item:"Bed",who:["javin"]}
  ],sleep:{javin:"11:00pm-8:00am (9hrs)"}},

  {date:"Jun 9",dow:"Tue",phase:"shanghai",location:"Shanghai",people:["javin","nick","cody"],bjj:{gym:"Nomadic Grappling",time:"11am + 7pm",count:"",who:["javin","nick"]},schedule:[
    {time:"9:00am",item:"Wake",who:["javin"]},
    {time:"9:30am",item:"Breakfast"},
    {time:"",item:"Full day (Day 7). Last day together."},
    {time:"11:00am-12:00pm",item:"🤼 Nomadic Grappling - Situational Class",tag:"bjj",who:["javin","nick"]},
    {time:"6:00pm",item:"Dinner"},
    {time:"7:00-8:00pm",item:"🤼 Nomadic Grappling - Advanced Nogi",tag:"bjj",who:["javin","nick"]},
    {time:"10:00pm",item:"Meeting 10pm-midnight",tag:"meeting",who:["javin"]},
    {time:"12:05am",item:"Bed",who:["javin"]}
  ],sleep:{javin:"12:05am-9:00am (9hrs)"},notes:"Javin and Cody depart tomorrow. Nick departs late tonight/early Jun 11."},

  // ===== RETURNS =====
  {date:"Jun 10",dow:"Wed",phase:"post",location:"Depart Shanghai",people:["javin","nick","cody"],schedule:[
    {time:"9:00am",item:"Wake, breakfast, pack",who:["javin"]},
    {time:"12:00pm",item:"Depart -> PVG (1 hr)",tag:"transport",who:["javin"]},
    {time:"12:00pm",item:"Depart -> PVG (1 hr)",tag:"transport",who:["cody"]},
    {time:"1:00pm",item:"Arrive PVG (3 hrs early)",who:["javin"]},
    {time:"1:00pm",item:"Arrive PVG (2 hrs early)",who:["cody"]},
    {time:"3:10pm",item:"Spring Airlines 9C6581 PVG -> KIX (2hr 20min)",tag:"flight",who:["cody"]},
    {time:"3:55pm",item:"Air Canada AC26 PVG -> YVR (10hr 25min)",tag:"flight",who:["javin"]},
    {time:"6:30pm",item:"Arrive KIX Osaka",who:["cody"]},
    {time:"11:20am",item:"Arrive YVR Vancouver (1hr 55min connect)",who:["javin"]},
    {time:"1:15pm",item:"AC8766 YVR -> SAN (3hr)",tag:"flight",who:["javin"]},
    {time:"4:15pm",item:"Arrive SAN San Diego",who:["javin"]},
    {time:"",item:"Free day in Shanghai",who:["nick"]},
    {time:"10:00pm",item:"Depart -> PVG (1 hr)",tag:"transport",who:["nick"]}
  ],notes:"Javin arrives SD 4:15pm - 9 days before Jun 19 Monterrey.",
  transitVisa:{
    limit:240,
    persons:{
      javin:{arrive:"Jun 1 2:30pm",depart:"Jun 10 3:55pm",hours:217.4},
      nick:{arrive:"Jun 1 2:30pm",depart:"Jun 11 12:20am",hours:225.8},
      cody:{arrive:"Jun 1 5:25pm",depart:"Jun 10 3:10pm",hours:213.75}
    }
  }},

  {date:"Jun 11",dow:"Thu",phase:"post",location:"Nick -> Zambia / Cody in Osaka",people:["nick","cody"],schedule:[
    {time:"12:20am",item:"Ethiopian ET685 PVG -> ADD (11hr 15min)",tag:"flight",who:["nick"]},
    {time:"6:35am",item:"Arrive ADD Addis Ababa (3hr 30min connect)",who:["nick"]},
    {time:"10:05am",item:"Ethiopian ET863 ADD -> LUN (4hr 05min)",tag:"flight",who:["nick"]},
    {time:"1:10pm",item:"Arrive LUN Lusaka. Zambia Day 1.",who:["nick"]},
    {time:"",item:"Day 1 in Osaka",who:["cody"]}
  ]},

  {date:"Jun 12-14",dow:"Fri-Sun",phase:"post",location:"Zambia / Cody in Osaka",people:["nick","cody"],schedule:[
    {time:"",item:"Zambia Days 2-4",who:["nick"]},
    {time:"",item:"Solo days in Osaka",who:["cody"]}
  ]},

  {date:"Jun 15",dow:"Mon",phase:"post",location:"Cody departs Osaka / Nick Zambia",people:["nick","cody"],schedule:[
    {time:"",item:"Zambia Day 5",who:["nick"]},
    {time:"4:00pm",item:"Depart for KIX airport",tag:"transport",who:["cody"]},
    {time:"6:30pm",item:"EVA Air BR129 KIX -> TPE (3hr)",tag:"flight",who:["cody"]},
    {time:"8:30pm",item:"Arrive TPE Taipei (3hr 10min connect)",who:["cody"]},
    {time:"11:40pm",item:"EVA Air BR28 TPE -> SFO (11hr 30min)",tag:"flight",who:["cody"]},
    {time:"8:10pm",item:"Arrive SFO same day",who:["cody"]}
  ],notes:"Cody arrives SFO Jun 15 8:10pm. 16 days since May 31 departure.",
  flags:[{text:"⚠️ Cody: 16 days SFO-to-SFO (May 31 → Jun 15) — slightly over 2-week limit",who:["cody"]}]},

  {date:"Jun 16-17",dow:"Tue-Wed",phase:"post",location:"Nick Zambia",people:["nick"],schedule:[
    {time:"",item:"Zambia Days 6-7 (1 full week)"}
  ]},

  {date:"Jun 18",dow:"Thu",phase:"post",location:"Nick departs Zambia",people:["nick"],schedule:[
    {time:"9:35pm",item:"Emirates EK714 LUN -> DXB (6hr 55min)",tag:"flight"}
  ]},

  {date:"Jun 19",dow:"Fri",phase:"post",location:"Nick -> SFO",people:["nick"],schedule:[
    {time:"6:30am",item:"Arrive DXB Dubai (2hr 40min connect)"},
    {time:"9:10am",item:"Emirates EK225 DXB -> SFO (15hr 50min)",tag:"flight"},
    {time:"2:00pm",item:"Arrive SFO"}
  ]},
];

const FLIGHTS = [
  {date:"May 13",route:"LAX -> MNL",flight:"PR 113",depart:"12:25pm",arrive:"6:00pm+1",who:"Javin, Jhoed",purchased:{javin:{yes:true,price:"$628"},jhoed:{yes:true,price:"$588"}}},
  {date:"May 13",route:"SFO -> MNL",flight:"UA809",depart:"1:30pm",arrive:"7:00pm+1",who:"Nick",purchased:{nick:{yes:false,est:"$689"}}},
  {date:"May 18",route:"MNL -> TAG",flight:"Z2 358",depart:"2:10pm",arrive:"3:30pm",who:"Javin, Jhoed, Nick",purchased:{javin:{yes:false,est:"$46"},jhoed:{yes:false,est:"$46"},nick:{yes:false,est:"$46"}}},
  {date:"May 21",route:"TAG -> ENI",flight:"5J 5611",depart:"3:40pm",arrive:"5:25pm",who:"Javin, Jhoed, Nick",purchased:{javin:{yes:false,est:"$260"},jhoed:{yes:false,est:"$260"},nick:{yes:false,est:"$260"}}},
  {date:"May 24",route:"ENI -> MPH -> MNL",flight:"T65410+PR2044",depart:"2:25pm",arrive:"6:55pm",who:"Javin, Jhoed, Nick",purchased:{javin:{yes:false,est:"$260"},jhoed:{yes:false,est:"$260"},nick:{yes:false,est:"$260"}}},
  {date:"May 26",route:"MNL -> NRT -> SAN",flight:"JL0746+JL0066",depart:"10:05am",arrive:"11:05am",who:"Jhoed",purchased:{jhoed:{yes:true,price:"$1,075.63"}}},
  {date:"May 31",route:"SFO -> PVG",flight:"CA7210",depart:"1:30pm",arrive:"5:25pm+1",who:"Cody",purchased:{cody:{yes:false,est:"$520"}}},
  {date:"Jun 1",route:"MNL -> PVG",flight:"PR 336",depart:"10:50am",arrive:"2:30pm",who:"Javin, Nick",purchased:{javin:{yes:false,est:"$182"},nick:{yes:false,est:"$182"}}},
  {date:"Jun 10",route:"PVG -> YVR -> SAN",flight:"AC26+AC8766",depart:"3:55pm",arrive:"4:15pm",who:"Javin",purchased:{javin:{yes:false,est:"$650"}}},
  {date:"Jun 10",route:"PVG -> KIX",flight:"9C6581",depart:"3:10pm",arrive:"6:30pm",who:"Cody",purchased:{cody:{yes:false,est:"$104"}}},
  {date:"Jun 15",route:"KIX -> TPE -> SFO",flight:"BR129+BR28",depart:"6:30pm",arrive:"8:10pm",who:"Cody",purchased:{cody:{yes:false,est:"$490"}}},
  {date:"Jun 11",route:"PVG -> ADD -> LUN",flight:"ET685+ET863",depart:"12:20am",arrive:"1:10pm",who:"Nick",purchased:{nick:{yes:false,est:"$871"}}},
  {date:"Jun 18",route:"LUN -> DXB -> SFO",flight:"EK714+EK225",depart:"9:35pm",arrive:"2:00pm+1",who:"Nick",purchased:{nick:{yes:false,est:"$1,235"}}},
];

const BJJ_DATA = [
  {n:1,date:"May 16",day:"Sat",gym:"Comp Training",count:"1/4",who:"Javin, Nick"},
  {n:2,date:"May 18",day:"Mon",gym:"Bohol BJJ",count:"Bohol 1/2",who:"Javin, Nick"},
  {n:3,date:"May 20",day:"Wed",gym:"Bohol BJJ",count:"Bohol 2/2",who:"Javin, Nick"},
  {n:4,date:"May 21",day:"Thu",gym:"Madness MMA",count:"El Nido",who:"Javin, Nick"},
  {n:5,date:"May 22",day:"Fri",gym:"Madness MMA",count:"El Nido",who:"Javin, Nick"},
  {n:6,date:"May 25",day:"Mon",gym:"Motion",count:"Manila",who:"Javin, Nick"},
  {n:7,date:"May 26",day:"Tue",gym:"KMA",count:"Manila",who:"Javin, Nick"},
  {n:8,date:"May 27",day:"Wed",gym:"Comp Training",count:"2/4",who:"Javin, Nick"},
  {n:9,date:"May 28",day:"Thu",gym:"Comp Training",count:"3/4",who:"Javin, Nick"},
  {n:10,date:"May 29",day:"Fri",gym:"Cavite City",count:"",who:"Javin, Nick"},
  {n:11,date:"May 30",day:"Sat",gym:"Comp Training",count:"4/4",who:"Javin, Nick"},
  {n:12,date:"Jun 2",day:"Tue",gym:"Nomadic Grappling",count:"Situational + Adv Nogi",who:"Javin, Nick"},
  {n:13,date:"Jun 3",day:"Wed",gym:"Nomadic Grappling",count:"Adv Class + Sparring",who:"Javin, Nick"},
  {n:14,date:"Jun 4",day:"Thu",gym:"Nomadic Grappling",count:"Situational + Leg Lock + Nogi",who:"Javin, Nick"},
  {n:15,date:"Jun 5",day:"Fri",gym:"Nomadic Grappling",count:"Adv Class + Adv Nogi",who:"Javin, Nick"},
  {n:16,date:"Jun 6",day:"Sat",gym:"Nomadic Grappling",count:"All Levels Leg Lock",who:"Javin, Nick"},
  {n:17,date:"Jun 7",day:"Sun",gym:"Nomadic Grappling",count:"All Levels Nogi",who:"Javin, Nick"},
  {n:18,date:"Jun 8",day:"Mon",gym:"Nomadic Grappling",count:"Adv Training + Adv Class",who:"Javin, Nick"},
  {n:19,date:"Jun 9",day:"Tue",gym:"Nomadic Grappling",count:"Situational + Adv Nogi",who:"Javin, Nick"},
];

const DEVIATIONS = [
  {date:"May 14",item:"Dinner",protocol:"10:30pm",actual:"10:00pm",dev:"30min early",icon:"🟡"},
  {date:"May 15",item:"Dinner",protocol:"10:30pm",actual:"8:30pm",dev:"2hr early",icon:"🔴"},
  {date:"May 15",item:"Bed",protocol:"1:00am",actual:"12:00am",dev:"1hr early",icon:"🟡"},
  {date:"May 16",item:"Wake",protocol:"10:00am",actual:"9:00am",dev:"1hr early",icon:"🟡"},
  {date:"May 16",item:"Breakfast",protocol:"10:30am",actual:"9:30am",dev:"1hr early",icon:"🟡"},
  {date:"May 16",item:"Dinner",protocol:"10:30pm",actual:"8:30pm",dev:"2hr early",icon:"🔴"},
  {date:"May 16",item:"Bed",protocol:"1:00am",actual:"12:00am",dev:"1hr early",icon:"🟡"},
  {date:"May 17",item:"Wake",protocol:"10:00am",actual:"9:00am",dev:"1hr early",icon:"🟡"},
  {date:"May 17",item:"Breakfast",protocol:"10:30am",actual:"9:30am",dev:"1hr early",icon:"🟡"},
  {date:"May 17",item:"Dinner",protocol:"10:30pm",actual:"8:30pm",dev:"2hr early",icon:"🔴"},
  {date:"May 17",item:"Bed",protocol:"1:00am",actual:"12:30am",dev:"30min early",icon:"🟡"},
  {date:"May 18",item:"Wake",protocol:"10:00am",actual:"9:30am",dev:"30min early",icon:"🟡"},
  {date:"May 18",item:"Breakfast",protocol:"10:30am",actual:"9:45am",dev:"45min early",icon:"🟡"},
  {date:"May 18",item:"Bed",protocol:"1:00am",actual:"12:00am",dev:"1hr early",icon:"🟡"},
  {date:"May 19",item:"Dinner",protocol:"10:30pm",actual:"9:00pm",dev:"1.5hr early",icon:"🔴"},
  {date:"May 20",item:"Wake",protocol:"10:00am",actual:"9:00am",dev:"1hr early",icon:"🟡"},
  {date:"May 20",item:"Breakfast",protocol:"10:30am",actual:"9:30am",dev:"1hr early",icon:"🟡"},
  {date:"May 20",item:"Bed",protocol:"1:00am",actual:"12:00am",dev:"1hr early",icon:"🟡"},
  {date:"May 21",item:"Dinner",protocol:"10:30pm",actual:"8:45pm",dev:"1hr 45min early",icon:"🔴"},
];

const HOTELS = [
  {location:"LAX Airport Hotel",name:"Westin LAX Airport",link:"https://www.marriott.com/en-us/hotels/laxwi-the-westin-los-angeles-airport/overview/",dates:"May 12-13",nights:1,people:"Javin, Jhoed",rooms:1,totalCost:225,status:"Not booked",perPerson:{javin:112.50,jhoed:112.50}},
  {location:"Bohol (Panglao)",name:"Henann Resort Alona Beach",link:"https://www.henann.com/bohol/henannalonabeach/",dates:"May 18-21",nights:3,people:"Javin, Jhoed +2, Nick +1 (6 ppl)",rooms:3,totalCost:1556,status:"Not booked",perPerson:{javin:518.67,jhoed:518.67,nick:518.67},notes:"Javin pays for his room w/ Jhoed ($518.67). Jhoed pays for +2 room ($518.67). Nick pays for +1."},
  {location:"El Nido",name:"Casa Maligaya",link:"https://www.instagram.com/casa.maligaya/",dates:"May 21-24",nights:3,people:"Javin, Jhoed, Nick +1 (4 ppl)",rooms:2,totalCost:900,status:"Not booked",perPerson:{javin:225,jhoed:225,nick:450},notes:"Nick pays for +1."},
  {location:"Manila",name:"Picasso Residence",link:"https://www.picassomakati.com/",dates:"May 25-26",nights:1,people:"Javin, Jhoed, Nick +1 (4 ppl)",rooms:2,totalCost:150,status:"Not booked",perPerson:{javin:37.50,jhoed:37.50,nick:75},notes:"Nick pays for +1."},
  {location:"Manila",name:"Picasso Residence",link:"https://www.picassomakati.com/",dates:"May 31 - Jun 1",nights:1,people:"Javin, Nick +1 (3 ppl)",rooms:2,totalCost:150,status:"Not booked",perPerson:{javin:75,nick:75}},
  {location:"Shanghai",name:"Home Inn Plus",link:"https://us.trip.com/hotels/detail/?hotelid=126698999&city=2&locale=en_us",dates:"Jun 1-10",nights:9,people:"Javin, Nick +1, Cody (4 ppl)",rooms:3,totalCost:1240.58,status:"Not booked",perPerson:{javin:435.79,nick:435.79,cody:369},notes:"Cody at $41/night. Javin & Nick at $48.42/room/night."},
  {location:"Shanghai (Nick only)",name:"Home Inn Plus",link:"https://us.trip.com/hotels/detail/?hotelid=126698999&city=2&locale=en_us",dates:"Jun 10-11",nights:1,people:"Nick +1 (2 ppl)",rooms:1,totalCost:48.42,status:"Not booked",perPerson:{nick:48.42},notes:"Extra night before 12:20am flight. $1,289 total for all Shanghai nights."},
  {location:"Osaka",name:"Mad Cat Hostel",link:"https://www.hostelworld.com/pwa/hosteldetails.php/Mad-Cat-Hostel-Osaka-Bar/Osaka/299246",dates:"Jun 10-15",nights:5,people:"Cody",rooms:1,totalCost:246,status:"Not booked",perPerson:{cody:246}},
  {location:"Zambia",name:"Urban Hotel",link:"https://theurbanhotelgroup.com/lusaka_home",dates:"Jun 11-18",nights:7,people:"Nick +1 (2 ppl)",rooms:1,totalCost:880,status:"Not booked",perPerson:{nick:880}},
];

function TagBadge({tag}){
  const c={flight:{bg:"#DBEAFE",text:"#1E40AF",border:"#93C5FD"},bjj:{bg:"#FEF3C7",text:"#92400E",border:"#FCD34D"},meeting:{bg:"#EDE9FE",text:"#5B21B6",border:"#C4B5FD"},transport:{bg:"#F3F4F6",text:"#374151",border:"#D1D5DB"}}[tag];
  if(!c)return null;
  return <span style={{fontSize:13,padding:"2px 8px",borderRadius:4,background:c.bg,color:c.text,border:`1px solid ${c.border}`,marginLeft:6,letterSpacing:.5,textTransform:"uppercase",fontWeight:600}}>{tag}</span>;
}

function filterSchedule(items, person) {
  if (!person) return items;
  return items.filter(s => !s.who || s.who.includes(person));
}

function PrintableSchedule({ days, person, flights, bjj, deviations, mono, bs }) {
  const personLabel = person ? PP[person].name : "Master";
  const personIcon = person ? PP[person].icon : "";
  const fltrs = person ? flights.filter(f=>f.who.toLowerCase().includes(PP[person]?.name.toLowerCase())) : flights;
  const bjjF = person ? bjj.filter(b=>b.who.toLowerCase().includes(PP[person]?.name.toLowerCase())) : bjj;
  const filtDays = person ? days.filter(d=>d.people?.includes(person)) : days;

  return (
    <div style={{background:"#fff",color:"#111",padding:32,...bs,fontSize:15}}>
      <h1 style={{fontSize:29,fontWeight:700,margin:"0 0 4px",color:"#111"}}>{personIcon} {personLabel} Schedule — Southeast Asia 2026</h1>
      <div style={{fontSize:14,color:"#666",marginBottom:20}}>May 8 – Jun 19, 2026</div>

      {filtDays.map((day, i) => {
        const sched = filterSchedule(day.schedule||[], person);
        if (sched.length === 0 && !day.notes) return null;
        const phase = PHASES.find(p=>p.id===day.phase);
        const showBjj = day.bjj && (!day.bjj.who || !person || day.bjj.who.includes(person));
        const sleepText = day.sleep && (typeof day.sleep==="string" ? day.sleep : (person ? day.sleep[person] : day.sleep.javin));
        return (
          <div key={i} style={{marginBottom:12,borderLeft:`3px solid ${phase?.color||"#ccc"}`,paddingLeft:12,pageBreakInside:"avoid"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
              <span style={{...mono,fontSize:13,fontWeight:700}}>{day.date}</span>
              <span style={{fontSize:13,color:"#666"}}>{day.dow}</span>
              <span style={{fontSize:13,fontWeight:600}}>{day.location}</span>
              {showBjj && <span style={{fontSize:13,padding:"2px 6px",borderRadius:3,background:"#FEF3C7",color:"#92400E",fontWeight:600}}>🤼 {day.bjj.gym} {day.bjj.count}</span>}
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>
                {sched.map((s,j) => (
                  <tr key={j}>
                    <td style={{...mono,fontSize:13,color:"#666",padding:"2px 10px 2px 0",verticalAlign:"top",whiteSpace:"nowrap",width:100}}>{s.time}</td>
                    <td style={{fontSize:14,color:s.tag==="bjj"?"#92400E":s.tag==="flight"?"#1E40AF":s.tag==="meeting"?"#5B21B6":"#111",padding:"2px 0",fontWeight:s.tag?600:400}}>
                      {!person && s.who && s.who.length < 4 && <span style={{fontSize:12,color:"#777",marginRight:3}}>[{s.who.map(w=>PP[w]?.name?.charAt(0)).join("")}]</span>}
                      {s.item}
                      {s.tag && <span style={{fontSize:12,marginLeft:4,padding:"1px 5px",borderRadius:2,border:"1px solid #ccc",color:"#777",textTransform:"uppercase"}}>{s.tag}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sleepText && <div style={{...mono,fontSize:13,color:"#555",marginTop:4}}>🛏️ {sleepText}</div>}
            {day.optional&&day.optional.filter(o=>!person||!o.who||o.who.includes(person)).map((o,oi)=><div key={oi} style={{fontSize:13,color:"#92400E",marginTop:3}}>❓ {o.item}</div>)}
            {day.notes && <div style={{fontSize:13,color:"#666",marginTop:2}}>{day.notes}</div>}
            {day.flags?.filter(f=>!person||!f.who||f.who.includes(person)).map((f,fi) => <div key={fi} style={{fontSize:13,color:"#B45309",marginTop:3}}>{f.text}</div>)}
            {day.transitVisa&&(()=>{const tv=day.transitVisa;const persons=person?{[person]:tv.persons[person]}:tv.persons;return Object.entries(persons).filter(([k,v])=>v).map(([k,v])=>{const ok=v.hours<=tv.limit;return <div key={k} style={{fontSize:13,color:ok?"#166534":"#991B1B",marginTop:3}}>{ok?"✅":"⚠️"} {PP[k]?.name} — {v.hours} hrs in Shanghai · Limit: {tv.limit} hrs {ok?`· ${(tv.limit - v.hours).toFixed(1)} hrs remaining`:` · OVER by ${(v.hours - tv.limit).toFixed(1)} hrs`}</div>})})()}
          </div>
        );
      })}

      {fltrs.length > 0 && (
        <div style={{marginTop:24,pageBreakBefore:"always"}}>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:8,color:"#111"}}>Flights</h2>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
            <thead><tr style={{borderBottom:"2px solid #ddd"}}>
              {["Date","Route","Flight","Depart","Arrive","Who"].map(h=><th key={h} style={{textAlign:"left",padding:"5px 8px",fontSize:13,color:"#555",textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>{fltrs.map((f,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #eee"}}>
                <td style={{padding:"4px 8px",...mono,fontSize:13,color:"#555"}}>{f.date}</td>
                <td style={{padding:"4px 8px",fontWeight:600}}>{f.route}</td>
                <td style={{padding:"4px 8px",...mono,fontSize:13,color:"#1E40AF"}}>{f.flight}</td>
                <td style={{padding:"4px 8px",...mono,fontSize:13}}>{f.depart}</td>
                <td style={{padding:"4px 8px",...mono,fontSize:13}}>{f.arrive}</td>
                <td style={{padding:"4px 8px",fontSize:13}}>{f.who}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {bjjF.length > 0 && (
        <div style={{marginTop:20}}>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:8,color:"#111"}}>BJJ Sessions</h2>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
            <thead><tr style={{borderBottom:"2px solid #ddd"}}>
              {["#","Date","Day","Gym","Notes","Who"].map(h=><th key={h} style={{textAlign:"left",padding:"5px 8px",fontSize:13,color:"#555",textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>{bjjF.map((b,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #eee"}}>
                <td style={{padding:"4px 8px",...mono,fontSize:13}}>{b.n}</td>
                <td style={{padding:"4px 8px",...mono,fontSize:13}}>{b.date}</td>
                <td style={{padding:"4px 8px",fontSize:13}}>{b.day}</td>
                <td style={{padding:"4px 8px",fontWeight:600,color:"#92400E"}}>{b.gym}</td>
                <td style={{padding:"4px 8px",fontSize:13,color:"#555"}}>{b.count}</td>
                <td style={{padding:"4px 8px",fontSize:13}}>{b.who}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {(!person || person === "javin") && deviations.length > 0 && (
        <div style={{marginTop:20}}>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:8,color:"#111"}}>Jet Lag Protocol Deviations</h2>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
            <thead><tr style={{borderBottom:"2px solid #ddd"}}>
              {["","Date","Item","Protocol","Actual","Deviation"].map(h=><th key={h} style={{textAlign:"left",padding:"5px 8px",fontSize:13,color:"#555",textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>{deviations.map((d,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #eee"}}>
                <td style={{padding:"4px 8px"}}>{d.icon}</td>
                <td style={{padding:"4px 8px",...mono,fontSize:13}}>{d.date}</td>
                <td style={{padding:"4px 8px",fontWeight:500}}>{d.item}</td>
                <td style={{padding:"4px 8px",...mono,fontSize:13,color:"#666"}}>{d.protocol}</td>
                <td style={{padding:"4px 8px",...mono,fontSize:13,color:d.icon==="🔴"?"#DC2626":"#B45309"}}>{d.actual}</td>
                <td style={{padding:"4px 8px",fontSize:13,color:"#555"}}>{d.dev}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function App(){
  const[activePhase,setActivePhase]=useState(null);
  const[activePerson,setActivePerson]=useState(null);
  const[activeTab,setActiveTab]=useState("schedule");
  const[expandedDays,setExpandedDays]=useState(new Set());
  const[showAll,setShowAll]=useState(false);
  const[printing,setPrinting]=useState(null); // null | "master" | "javin" | "jhoed" | "nick" | "cody"
  const[showPrintMenu,setShowPrintMenu]=useState(false);

  const filtered=DAYS.filter(d=>{if(activePhase&&d.phase!==activePhase)return false;if(activePerson&&!d.people?.includes(activePerson))return false;return true});
  const filteredBJJ=activePerson?BJJ_DATA.filter(b=>b.who.toLowerCase().includes(PP[activePerson]?.name.toLowerCase())):BJJ_DATA;
  const filteredFlights=activePerson?FLIGHTS.filter(f=>f.who.toLowerCase().includes(PP[activePerson]?.name.toLowerCase())):FLIGHTS;
  const bs={fontFamily:"'DM Sans',sans-serif"};
  const mono={fontFamily:"'JetBrains Mono',monospace"};

  const toggleDay = (i) => {
    setShowAll(false);
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };
  const toggleShowAll = () => {
    if (showAll) {
      setExpandedDays(new Set());
      setShowAll(false);
    } else {
      const allIdx = new Set();
      filtered.forEach((_, i) => allIdx.add(i));
      setExpandedDays(allIdx);
      setShowAll(true);
    }
  };
  const isDayExpanded = (i) => showAll || expandedDays.has(i);

  const handlePrint = (target) => {
    setPrinting(target);
    setShowPrintMenu(false);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrinting(null), 500);
    }, 100);
  };
  if (printing) {
    return <PrintableSchedule days={DAYS} person={printing === "master" ? null : printing} flights={FLIGHTS} bjj={BJJ_DATA} deviations={DEVIATIONS} mono={mono} bs={bs} />;
  }

  return(
    <div style={{...bs,background:"#0F1923",color:"#E7E9EA",minHeight:"100vh"}} onClick={()=>showPrintMenu&&setShowPrintMenu(false)}>
      <style>{`@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{background:"linear-gradient(135deg,#131D2A 0%,#0A1018 100%)",borderBottom:"1px solid #1E2D3D",padding:"28px 24px 20px"}}>
        <div style={{fontSize:13,letterSpacing:3,color:"#A0A4AA",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>Master Schedule</div>
        <h1 style={{fontSize:37,fontWeight:700,margin:0,background:"linear-gradient(90deg,#F7931A,#FFCB47)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Southeast Asia 2026</h1>
        <div style={{fontSize:16,color:"#A0A4AA",marginTop:8}}>May 8 - Jun 19 · 4 travelers · 19 BJJ sessions · Philippines · Shanghai · Osaka
          {activePerson && <span style={{marginLeft:8,padding:"3px 10px",borderRadius:4,background:PP[activePerson].color+"20",color:PP[activePerson].color,fontWeight:600,fontSize:15}}>{PP[activePerson].icon} {PP[activePerson].name}'s schedule</span>}
        </div>
      </div>
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #1E2D3D",background:"#131D2A",overflowX:"auto"}}>
        {[{id:"schedule",label:"Daily Schedule"},{id:"flights",label:"Flights"},{id:"bjj",label:"BJJ"},{id:"hotels",label:"Hotels"},{id:"deviations",label:"Protocol Deviations"}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"14px 22px",background:"none",border:"none",borderBottom:activeTab===t.id?"3px solid #F7931A":"3px solid transparent",color:activeTab===t.id?"#F7931A":"#9CA3AF",...bs,fontSize:16,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{t.label}</button>
        ))}
      </div>
      <div style={{padding:"16px 24px",display:"flex",gap:24,flexWrap:"wrap",borderBottom:"1px solid #1E2D3D"}}>
        <div>
          <div style={{fontSize:13,color:"#A0A4AA",textTransform:"uppercase",letterSpacing:1,marginBottom:8,fontWeight:600}}>Phase</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            <button onClick={()=>setActivePhase(null)} style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${!activePhase?"#F7931A":"#1E2D3D"}`,background:!activePhase?"#F7931A20":"transparent",color:!activePhase?"#F7931A":"#9CA3AF",fontSize:14,...bs,cursor:"pointer",fontWeight:500}}>All</button>
            {PHASES.map(p=>(<button key={p.id} onClick={()=>setActivePhase(activePhase===p.id?null:p.id)} style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${activePhase===p.id?p.color:"#1E2D3D"}`,background:activePhase===p.id?p.color+"20":"transparent",color:activePhase===p.id?p.color:"#9CA3AF",fontSize:14,...bs,cursor:"pointer",fontWeight:500}}>{p.label}</button>))}
          </div>
        </div>
        <div>
          <div style={{fontSize:13,color:"#A0A4AA",textTransform:"uppercase",letterSpacing:1,marginBottom:8,fontWeight:600}}>Person</div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>setActivePerson(null)} style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${!activePerson?"#F7931A":"#1E2D3D"}`,background:!activePerson?"#F7931A20":"transparent",color:!activePerson?"#F7931A":"#9CA3AF",fontSize:14,...bs,cursor:"pointer",fontWeight:500}}>All</button>
            {Object.entries(PP).map(([k,v])=>(<button key={k} onClick={()=>setActivePerson(activePerson===k?null:k)} style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${activePerson===k?v.color:"#1E2D3D"}`,background:activePerson===k?v.color+"20":"transparent",color:activePerson===k?v.color:"#9CA3AF",fontSize:14,...bs,cursor:"pointer",fontWeight:500}}>{v.icon} {v.name}</button>))}
          </div>
        </div>
      </div>
      {/* ACTION BUTTONS */}
      {activeTab==="schedule"&&(
        <div style={{padding:"12px 24px",display:"flex",gap:8,borderBottom:"1px solid #1E2D3D",alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={toggleShowAll} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #1E2D3D",background:showAll?"#F7931A20":"transparent",color:showAll?"#F7931A":"#9CA3AF",...bs,fontSize:15,fontWeight:600,cursor:"pointer"}}>
            {showAll ? "Collapse All" : "Show All"}
          </button>
          <div style={{position:"relative"}}>
            <button onClick={(e)=>{e.stopPropagation();setShowPrintMenu(!showPrintMenu)}} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #1E2D3D",background:"transparent",color:"#9CA3AF",...bs,fontSize:15,fontWeight:600,cursor:"pointer"}}>
              🖨️ Print PDF
            </button>
            {showPrintMenu && (
              <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"100%",left:0,marginTop:4,background:"#131D2A",border:"1px solid #1E2D3D",borderRadius:8,overflow:"hidden",zIndex:100,minWidth:200,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
                <button onClick={()=>handlePrint("master")} style={{display:"block",width:"100%",padding:"10px 16px",border:"none",borderBottom:"1px solid #1E2D3D",background:"transparent",color:"#E7E9EA",...bs,fontSize:15,fontWeight:500,cursor:"pointer",textAlign:"left"}}>
                  📋 Master Schedule (All)
                </button>
                {Object.entries(PP).map(([k,v])=>(
                  <button key={k} onClick={()=>handlePrint(k)} style={{display:"block",width:"100%",padding:"10px 16px",border:"none",borderBottom:"1px solid #1E2D3D20",background:"transparent",color:v.color,...bs,fontSize:15,fontWeight:500,cursor:"pointer",textAlign:"left"}}>
                    {v.icon} {v.name}'s Schedule
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab==="schedule"&&(<div style={{padding:"16px 16px 40px"}}>{filtered.map((day,i)=>{const phase=PHASES.find(p=>p.id===day.phase);const isExp=isDayExpanded(i);const sched=filterSchedule(day.schedule||[],activePerson);const showBjj=day.bjj&&(!day.bjj.who||!activePerson||day.bjj.who.includes(activePerson));const showProtocol=day.protocol&&(!activePerson||activePerson==="javin");const sleepText=day.sleep&&(typeof day.sleep==="string"?day.sleep:(activePerson?day.sleep[activePerson]:day.sleep.javin));if(sched.length===0&&!day.notes&&!(day.optional&&day.optional.some(o=>!activePerson||!o.who||o.who.includes(activePerson))))return null;return(<div key={i} onClick={()=>toggleDay(i)} style={{marginBottom:8,border:`1px solid ${isExp?phase?.color+"60":"#1E2D3D"}`,borderRadius:8,overflow:"hidden",cursor:"pointer",background:isExp?"#131D2A":"#0D1520"}}><div style={{display:"flex",alignItems:"center",padding:"12px 18px",gap:14}}><div style={{width:4,height:36,borderRadius:2,background:phase?.color,flexShrink:0}}/><div style={{minWidth:64}}><div style={{...mono,fontSize:19,fontWeight:700,color:"#F0F2F4"}}>{day.date}</div><div style={{fontSize:14,color:"#A0A4AA"}}>{day.dow}</div></div><div style={{flex:1}}><div style={{fontSize:16,fontWeight:600,color:"#E7E9EA"}}>{day.location}</div><div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>{(activePerson?[activePerson]:day.people||[]).map(p=><span key={p} style={{fontSize:14}}>{PP[p]?.icon}</span>)}{showBjj&&<span style={{fontSize:13,padding:"2px 8px",borderRadius:4,background:"#FEF3C7",color:"#92400E",fontWeight:600,marginLeft:4}}>🤼 {day.bjj.gym} {day.bjj.count}</span>}{showProtocol&&<span style={{fontSize:13,padding:"2px 8px",borderRadius:4,background:"#DBEAFE20",color:"#93C5FD",fontWeight:500,marginLeft:4}}>{day.protocol}</span>}</div></div><div style={{fontSize:22,color:"#A0A8B4",transform:isExp?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}>▾</div></div>{isExp&&(<div style={{padding:"0 16px 16px",borderTop:"1px solid #1A2838"}} onClick={e=>e.stopPropagation()}><table style={{width:"100%",borderCollapse:"collapse",marginTop:12,tableLayout:"fixed"}}><tbody>{sched.map((s,j)=>(<tr key={j}><td style={{...mono,fontSize:15,color:"#C0C4CC",padding:"7px 16px 7px 0",verticalAlign:"top",whiteSpace:"nowrap",width:125,textAlign:"left"}}>{s.time}</td><td style={{fontSize:16,color:s.tag==="bjj"?"#FCD34D":s.tag==="flight"?"#A5D0FE":s.tag==="meeting"?"#D4C5FF":"#E7E9EA",padding:"6px 0",fontWeight:s.tag==="bjj"||s.tag==="flight"?600:400,textAlign:"left",verticalAlign:"top"}}>{s.who&&activePerson===null&&s.who.length<4&&<span style={{fontSize:13,color:"#A0A4AA",marginRight:4}}>[{s.who.map(w=>PP[w]?.name?.charAt(0)).join("")}]</span>}{s.item}{s.tag&&<TagBadge tag={s.tag}/>}</td></tr>))}</tbody></table>{sleepText&&<div style={{marginTop:10,padding:"8px 12px",background:"#1A2535",borderRadius:6,fontSize:15,...mono,color:"#C0C8D4",textAlign:"left"}}>🛏️ {sleepText}</div>}{day.optional&&day.optional.filter(o=>!activePerson||!o.who||o.who.includes(activePerson)).map((o,oi)=><div key={oi} style={{marginTop:8,fontSize:14,color:"#EAB308",padding:"8px 12px",background:"#EAB30810",borderRadius:4,border:"1px solid #EAB30830",textAlign:"left"}}><span style={{marginRight:6}}>❓</span>{o.item}</div>)}{day.notes&&<div style={{marginTop:8,fontSize:14,color:"#A0A4AA",lineHeight:1.6,textAlign:"left"}}>{day.notes}</div>}{day.flags?.filter(f=>!activePerson||!f.who||f.who.includes(activePerson)).map((f,fi)=><div key={fi} style={{marginTop:6,fontSize:14,color:"#FBBF24",padding:"8px 12px",background:"#FBBF2410",borderRadius:4,border:"1px solid #FBBF2430"}}>{f.text}</div>)}{day.transitVisa&&(()=>{const tv=day.transitVisa;const persons=activePerson?{[activePerson]:tv.persons[activePerson]}:tv.persons;return Object.entries(persons).filter(([k,v])=>v).map(([k,v])=>{const ok=v.hours<=tv.limit;return <div key={k} style={{marginTop:6,fontSize:14,padding:"8px 12px",background:ok?"#34D39910":"#F8717110",borderRadius:4,border:`1px solid ${ok?"#34D39930":"#F8717130"}`,color:ok?"#34D399":"#F87171",textAlign:"left"}}>{ok?"✅":"⚠️"} <span style={{fontWeight:600}}>{PP[k]?.name}</span> — {v.hours} hrs in Shanghai ({v.arrive} → {v.depart}) · Limit: {tv.limit} hrs {ok?`· ${(tv.limit - v.hours).toFixed(1)} hrs remaining`:` · OVER by ${(v.hours - tv.limit).toFixed(1)} hrs`}</div>})})()}</div>)}</div>)})}</div>)}
      {activeTab==="flights"&&(<div style={{padding:"24px 16px",overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:15}}><thead><tr style={{borderBottom:"2px solid #1E2D3D"}}>{["Date","Route","Flight","Depart","Arrive","Who","Status"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",color:"#9CA3AF",fontWeight:600,fontSize:13,textTransform:"uppercase",letterSpacing:1}}>{h}</th>)}</tr></thead><tbody>{filteredFlights.map((f,i)=>{const ppl=activePerson?[activePerson]:Object.keys(f.purchased||{});const allBought=ppl.every(p=>f.purchased?.[p]?.yes);const anyBought=ppl.some(p=>f.purchased?.[p]?.yes);const prices=ppl.filter(p=>f.purchased?.[p]?.yes&&f.purchased[p].price).map(p=>activePerson?f.purchased[p].price:`${PP[p]?.name}: ${f.purchased[p].price}`);return(<tr key={i} style={{borderBottom:"1px solid #1E2D3D"}}><td style={{padding:"8px 10px",...mono,fontSize:14,color:"#B0B8C4"}}>{f.date}</td><td style={{padding:"8px 10px",fontWeight:600,color:"#E7E9EA"}}>{f.route}</td><td style={{padding:"8px 10px",...mono,fontSize:14,color:"#93C5FD"}}>{f.flight}</td><td style={{padding:"8px 10px",...mono,fontSize:14,color:"#B0B8C4"}}>{f.depart}</td><td style={{padding:"8px 10px",...mono,fontSize:14,color:"#B0B8C4"}}>{f.arrive}</td><td style={{padding:"8px 10px",fontSize:14,color:"#E7E9EA"}}>{f.who}</td><td style={{padding:"8px 10px",fontSize:13}}>{allBought?<span style={{color:"#34D399"}}>✓ {prices.join(", ")}</span>:anyBought?<span><span style={{color:"#34D399"}}>✓ {prices.join(", ")}</span><br/><span style={{color:"#FBBF24"}}>⬡ Others est. {ppl.filter(p=>!f.purchased?.[p]?.yes&&f.purchased?.[p]?.est).map(p=>activePerson?f.purchased[p].est:`${PP[p]?.name}: ${f.purchased[p].est}`).join(", ")}</span></span>:<span style={{color:"#FBBF24"}}>⬡ Est. {ppl.filter(p=>f.purchased?.[p]?.est).map(p=>activePerson?f.purchased[p].est:`${PP[p]?.name}: ${f.purchased[p].est}`).join(", ")}</span>}</td></tr>)})}</tbody></table>{(()=>{const people=activePerson?[activePerson]:["javin","jhoed","nick","cody"];const parsePrice=s=>{if(!s)return 0;return parseFloat(s.replace(/[$,~]/g,""))||0;};return(<div style={{marginTop:20,padding:16,background:"#131D2A",borderRadius:8,border:"1px solid #1E2D3D"}}><div style={{fontSize:15,fontWeight:600,color:"#E7E9EA",marginBottom:12}}>Flight Cost Summary</div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{borderBottom:"2px solid #1E2D3D"}}>{["Person","Purchased","Est. Unpurchased","Est. Total"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#9CA3AF",fontWeight:600,fontSize:12,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{people.map(p=>{let bought=0,unbought=0;FLIGHTS.forEach(f=>{const d=f.purchased?.[p];if(!d)return;if(d.yes)bought+=parsePrice(d.price);else unbought+=parsePrice(d.est);});return(<tr key={p} style={{borderBottom:"1px solid #1E2D3D"}}><td style={{padding:"6px 10px",fontSize:14,color:PP[p]?.color,fontWeight:600}}>{PP[p]?.icon} {PP[p]?.name}</td><td style={{padding:"6px 10px",...mono,fontSize:14,color:"#34D399"}}>{bought>0?`$${bought.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:2})}`:"—"}</td><td style={{padding:"6px 10px",...mono,fontSize:14,color:"#FBBF24"}}>{unbought>0?`$${unbought.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`:"—"}</td><td style={{padding:"6px 10px",...mono,fontSize:14,fontWeight:600,color:"#E7E9EA"}}>${(bought+unbought).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:2})}</td></tr>)})}{(()=>{let totalBought=0,totalUnbought=0;people.forEach(p=>{FLIGHTS.forEach(f=>{const d=f.purchased?.[p];if(!d)return;if(d.yes)totalBought+=parsePrice(d.price);else totalUnbought+=parsePrice(d.est);});});return(<tr style={{borderTop:"2px solid #1E2D3D"}}><td style={{padding:"8px 10px",fontSize:14,fontWeight:600,color:"#E7E9EA"}}>Total (all)</td><td style={{padding:"8px 10px",...mono,fontSize:14,fontWeight:600,color:"#34D399"}}>${totalBought.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:2})}</td><td style={{padding:"8px 10px",...mono,fontSize:14,fontWeight:600,color:"#FBBF24"}}>${totalUnbought.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}</td><td style={{padding:"8px 10px",...mono,fontSize:14,fontWeight:700,color:"#E7E9EA"}}>${(totalBought+totalUnbought).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:2})}</td></tr>);})()}</tbody></table></div>);})()}</div>)}
      {activeTab==="bjj"&&(<div style={{padding:"24px 16px"}}><div style={{fontSize:16,color:"#A0A4AA",marginBottom:16}}>{activePerson?`${PP[activePerson].name}'s BJJ sessions: ${filteredBJJ.length}`:"19 sessions across 7 gyms (11 Philippines + 8 Shanghai). Nick trains every session with Javin."}</div><table style={{width:"100%",borderCollapse:"collapse",fontSize:15}}><thead><tr style={{borderBottom:"2px solid #1E2D3D"}}>{["#","Date","Day","Gym","Notes","Who"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",color:"#9CA3AF",fontWeight:600,fontSize:13,textTransform:"uppercase",letterSpacing:1}}>{h}</th>)}</tr></thead><tbody>{filteredBJJ.map((b,i)=>(<tr key={i} style={{borderBottom:"1px solid #1E2D3D"}}><td style={{padding:"8px 10px",...mono,fontSize:14,color:"#A0A4AA"}}>{b.n}</td><td style={{padding:"8px 10px",...mono,fontSize:14,color:"#B0B8C4"}}>{b.date}</td><td style={{padding:"8px 10px",fontSize:14,color:"#B0B8C4"}}>{b.day}</td><td style={{padding:"8px 10px",fontWeight:600,color:"#FCD34D"}}>{b.gym}</td><td style={{padding:"8px 10px",fontSize:14,color:"#A0A4AA"}}>{b.count}</td><td style={{padding:"8px 10px",fontSize:14,color:"#A0A4AA"}}>{b.who}</td></tr>))}</tbody></table>{(!activePerson||activePerson==="javin")&&(<div style={{marginTop:24,padding:16,background:"#131D2A",borderRadius:8,border:"1px solid #1E2D3D"}}><div style={{fontSize:15,fontWeight:600,color:"#E7E9EA",marginBottom:12}}>Javin's Constraints Met</div>{["Comp Training Sat 1x - May 16","Comp Training Mon-Thu 1x - May 27, 28","Bohol BJJ 2x - May 18, 20","Motion 1x - May 25","Cavite City 1x - May 29","Max 1 BJJ/day - every day","Comp Training total: 4/4","Nomadic Grappling Shanghai: 8 days (Jun 2-9)"].map((c,i)=>(<div key={i} style={{fontSize:14,color:"#34D399",padding:"4px 0",...mono}}>✓ {c}</div>))}</div>)}</div>)}
      {activeTab==="hotels"&&(<div style={{padding:"24px 16px",overflowX:"auto"}}><div style={{fontSize:16,color:"#A0A4AA",marginBottom:16}}>31 nights, 51 room-nights across 9 bookings. Double occupancy. Nick pays for +1, Jhoed pays for +2.</div><table style={{width:"100%",borderCollapse:"collapse",fontSize:15}}><thead><tr style={{borderBottom:"2px solid #1E2D3D"}}>{["Location","Name","Dates","Nights","People","Rooms","Total","Status"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",color:"#9CA3AF",fontWeight:600,fontSize:12,textTransform:"uppercase",letterSpacing:1}}>{h}</th>)}</tr></thead><tbody>{HOTELS.filter(h=>!activePerson||h.perPerson?.[activePerson]!==undefined).map((h,i)=>(<tr key={i} style={{borderBottom:"1px solid #1E2D3D"}}><td style={{padding:"8px 10px",fontSize:14,color:"#E7E9EA",fontWeight:600}}>{h.location}</td><td style={{padding:"8px 10px",fontSize:14}}>{h.link?<a href={h.link} target="_blank" rel="noopener noreferrer" style={{color:"#93C5FD",textDecoration:"none"}}>{h.name}</a>:<span style={{color:"#9CA3AF"}}>{h.name}</span>}</td><td style={{padding:"8px 10px",...mono,fontSize:13,color:"#B0B8C4",whiteSpace:"nowrap"}}>{h.dates}</td><td style={{padding:"8px 10px",...mono,fontSize:14,color:"#B0B8C4",textAlign:"center"}}>{h.nights}</td><td style={{padding:"8px 10px",fontSize:13,color:"#A0A4AA"}}>{h.people}</td><td style={{padding:"8px 10px",...mono,fontSize:14,color:"#B0B8C4",textAlign:"center"}}>{h.rooms}</td><td style={{padding:"8px 10px",...mono,fontSize:14,color:h.totalCost?"#E7E9EA":"#9CA3AF"}}>{h.totalCost?`$${h.totalCost.toLocaleString()}`:"TBD"}</td><td style={{padding:"8px 10px",fontSize:13}}>{h.status==="Booked"?<span style={{color:"#34D399"}}>✓ Booked</span>:<span style={{color:"#FBBF24"}}>⬡ Not booked</span>}</td></tr>))}</tbody></table>{!activePerson&&(()=>{const people=["javin","jhoed","nick","cody"];const parsePrice=v=>(typeof v==="number")?v:0;return(<div style={{marginTop:20,padding:16,background:"#131D2A",borderRadius:8,border:"1px solid #1E2D3D"}}><div style={{fontSize:15,fontWeight:600,color:"#E7E9EA",marginBottom:12}}>Lodging Cost Per Person</div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{borderBottom:"2px solid #1E2D3D"}}>{["Person","Total","TBD Bookings"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#9CA3AF",fontWeight:600,fontSize:12,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{people.map(p=>{let known=0,unknownCount=0;HOTELS.forEach(h=>{const v=h.perPerson?.[p];if(v===undefined)return;if(v!==null)known+=parsePrice(v);else unknownCount++;});return(<tr key={p} style={{borderBottom:"1px solid #1E2D3D"}}><td style={{padding:"6px 10px",fontSize:14,color:PP[p]?.color,fontWeight:600}}>{PP[p]?.icon} {PP[p]?.name}</td><td style={{padding:"6px 10px",...mono,fontSize:14,fontWeight:600,color:"#E7E9EA"}}>{known>0?`$${known.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}${unknownCount>0?"+":""}`:"TBD"}</td><td style={{padding:"6px 10px",fontSize:13,color:unknownCount>0?"#FBBF24":"#34D399"}}>{unknownCount>0?`${unknownCount} TBD`:"✓ All known"}</td></tr>)})}{(()=>{let total=0;people.forEach(p=>{HOTELS.forEach(h=>{const v=h.perPerson?.[p];if(v===undefined||v===null)return;total+=parsePrice(v);});});return(<tr style={{borderTop:"2px solid #1E2D3D"}}><td style={{padding:"8px 10px",fontSize:14,fontWeight:600,color:"#E7E9EA"}}>Total (all)</td><td style={{padding:"8px 10px",...mono,fontSize:14,fontWeight:700,color:"#E7E9EA"}}>${total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td></td></tr>);})()}</tbody></table></div>);})()}{activePerson&&(()=>{const people=[activePerson];return(<div style={{marginTop:20,padding:16,background:"#131D2A",borderRadius:8,border:"1px solid #1E2D3D"}}><div style={{fontSize:15,fontWeight:600,color:"#E7E9EA",marginBottom:12}}>Lodging Cost Per Person</div>{people.map(p=>{let known=0,unknownCount=0;const stays=[];HOTELS.forEach(h=>{const v=h.perPerson?.[p];if(v===undefined)return;if(v!==null){known+=v;stays.push({location:h.location,dates:h.dates,amount:v,known:true});}else{unknownCount++;stays.push({location:h.location,dates:h.dates,amount:null,known:false});}});if(stays.length===0)return null;return(<div key={p} style={{marginBottom:16,paddingBottom:16,borderBottom:"1px solid #1E2D3D"}}><div style={{fontSize:14,fontWeight:600,color:PP[p]?.color,marginBottom:8}}>{PP[p]?.icon} {PP[p]?.name}</div><table style={{width:"100%",borderCollapse:"collapse",marginLeft:8}}><tbody>{stays.map((s,i)=>(<tr key={i}><td style={{padding:"3px 10px 3px 0",fontSize:13,color:"#A0A4AA",width:180,whiteSpace:"nowrap"}}>{s.location}</td><td style={{padding:"3px 10px",...mono,fontSize:12,color:"#9CA3AF",width:120,whiteSpace:"nowrap"}}>{s.dates}</td><td style={{padding:"3px 10px",...mono,fontSize:13,color:s.known?"#34D399":"#FBBF24",textAlign:"right"}}>{s.known?`$${s.amount.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"TBD"}</td></tr>))}<tr style={{borderTop:"1px solid #1E2D3D"}}><td colSpan={2} style={{padding:"6px 10px 3px 0",fontSize:13,fontWeight:600,color:"#E7E9EA"}}>Total{unknownCount>0?` (${unknownCount} TBD)`:""}</td><td style={{padding:"6px 10px 3px",...mono,fontSize:14,fontWeight:600,color:"#E7E9EA",textAlign:"right"}}>{known>0?`$${known.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}${unknownCount>0?"+":""}`:"TBD"}</td></tr></tbody></table></div>)})}</div>);})()}</div>)}
      {activeTab==="deviations"&&(<div style={{padding:"24px 16px",overflowX:"auto"}}><div style={{fontSize:16,color:"#A0A4AA",marginBottom:8}}>Javin's jet lag protocol active May 14-21. Deviations from protocol times:</div><div style={{fontSize:14,color:"#A0A4AA",marginBottom:16}}>🟡 ≤ 1 hour   🔴 {">"} 1 hour</div><table style={{width:"100%",borderCollapse:"collapse",fontSize:15}}><thead><tr style={{borderBottom:"2px solid #1E2D3D"}}>{["","Date","Item","Protocol","Actual","Deviation"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",color:"#9CA3AF",fontWeight:600,fontSize:13,textTransform:"uppercase",letterSpacing:1}}>{h}</th>)}</tr></thead><tbody>{DEVIATIONS.map((d,i)=>(<tr key={i} style={{borderBottom:"1px solid #1E2D3D"}}><td style={{padding:"6px 10px",fontSize:18}}>{d.icon}</td><td style={{padding:"6px 10px",...mono,fontSize:14,color:"#B0B8C4"}}>{d.date}</td><td style={{padding:"6px 10px",fontSize:14,color:"#E7E9EA",fontWeight:500}}>{d.item}</td><td style={{padding:"6px 10px",...mono,fontSize:14,color:"#A0A4AA"}}>{d.protocol}</td><td style={{padding:"6px 10px",...mono,fontSize:14,color:d.icon==="🔴"?"#F87171":"#FCD34D"}}>{d.actual}</td><td style={{padding:"6px 10px",fontSize:14,color:"#A0A4AA"}}>{d.dev}</td></tr>))}</tbody></table></div>)}
    </div>
  );
}
