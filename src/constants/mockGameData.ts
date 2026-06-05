// Possible detailedState and statusCode
// Delayed (D), Completed Early (C), Suspended (S), Postponed (P), Cancelled (C)

const upcomingStatus = {
  abstractGameState: 'Preview',
  codedGameState: 'S',
  detailedState: 'Scheduled',
  statusCode: 'S',
  startTimeTBD: false,
  abstractGameCode: 'P'
}

const currentStatus = {
  abstractGameState: 'Live',
  codedGameState: 'I',
  detailedState: 'In Progress',
  statusCode: 'I',
  startTimeTBD: false,
  abstractGameCode: 'L'
}

const concludedStatus = {
  abstractGameState: 'Final',
  codedGameState: 'F',
  detailedState: 'Final',
  statusCode: 'F',
  startTimeTBD: false,
  abstractGameCode: 'F'
}

