import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from "body-parser";
import { ResponseCode } from "./ResponseCode";

admin.initializeApp();

const app = express();
const firestore = admin.firestore();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
* @api {get} /api/calendar/create create a calendar
*/
app.get('/calendar/create', function (req, res) {
  var uuid = createUniqueId();
  var calendar = firestore.collection('calendars').doc(uuid);

  calendar.get().then((docSnapshot) => {
    if(!docSnapshot.exists) {
      calendar.set({ updated: + new Date() }).then((docSnapshot) => {
        res.send(JSON.stringify({ uuid: uuid }));
      });
    } else {
      res.send(JSON.stringify({ error: ResponseCode.CALENDAR_ALREADY_EXISTS }));
    }
  });
});

/**
* @api {get} /api/calendar/:uuid/events get all events
*
* @apiParam  {String} [uuid] the uuid of the calendar
*/
app.get('/calendar/:uuid/events', function (req, res) {
  requestCalendar(req.params.uuid).then(calendar => {
    calendar.collection('events').get().then(snapshot => {
      var events = [];
      snapshot.forEach(event => {
        events.push(event.data());
      });
      res.send(JSON.stringify({ events: events }));
    }).catch(err => {
      res.send(JSON.stringify({ error: ResponseCode.FIREBASE_ERROR }));
    });
  }).catch(err => {
    res.send(JSON.stringify({ error: ResponseCode.FIREBASE_ERROR }));
  });
});

/**
* @api {post} /api/calendar/:uuid/events/create create an event
*
* @apiParam  {String} [uuid] the calendar's uuid
* @apiParam  {String} [name] event name
* @apiParam  {String} [description] event description
* @apiParam  {String} [date] the date of the event
*
*/
app.post('/calendar/:uuid/events/create', function (req, res) {
  var event = req.body;

  requestCalendar(req.params.uuid).then(calendar => {
    var events = calendar.collection('events');
    events.add({
      name: event.name,
      description: event.description,
      date: event.date
    }).then((docSnapshot) => {
      res.send(JSON.stringify({ event: event }));
    });
  }).catch(err => {
    res.send(JSON.stringify({ error: err }));
  });
});

const requestCalendar = (uuid) => {
  return new Promise<admin.firestore.DocumentReference>((resolve, reject) => {
    var calendarDocument = firestore.collection('calendars').doc(uuid);

    calendarDocument.get().then((calendar) => {
      if(calendar.exists) {
        calendarDocument.update({ updated: + new Date() }).then((docSnapshot) => {
          resolve(calendarDocument)
        }).catch(err => {
          reject(ResponseCode.FIREBASE_ERROR);
        });
      } else {
        reject(ResponseCode.CALENDAR_ALREADY_EXISTS); // TODO
      }

    })
    .catch(err => {
      reject(err);
    });
  });
};

/*
 * create a unique id
 */
function createUniqueId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

exports.api = functions.https.onRequest(app);
