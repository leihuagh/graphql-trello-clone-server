require('./ticket.schema');
require('../board/board.schema');
require('../comment/comment.schema');
require('../history-record/history-record.schema');
const mhelper = require('../../helper/mongoose');
const mongoose = require('mongoose');
const resolver = require('./ticket.resolver');

const Ticket = mongoose.model('Ticket');
const Comment = mongoose.model('Comment');
const Board = mongoose.model('Board');
const HisotryRecord = mongoose.model('HistoryRecord');

const clearDb = async () => {
  await Ticket.remove({});
  await Comment.remove({});
  await Board.remove({});
  await HisotryRecord.remove({});
};

const fillDb = async () => {
  const comment = await Comment.create({
    body: 'Test Comment',
  });

  const board = await Board.create({
    label: 'Test Board',
  });

  const history = await HisotryRecord.create({
    dateTime: new Date(),
    item: comment._id,
    itemType: 'comment',
  });

  const ticket = await Ticket.create({
    label: 'Test Ticket',
    body: 'Test ticket body',
    created: new Date(),
    board: board._id,
    comments: [comment._id],
    history: [history._id],
  });

  return ticket;
};

let ticket;

beforeAll(async (done) => {
  await mhelper.connect();
  done();
});

afterAll(async (done) => {
  await mhelper.disconnect();
  done();
});

beforeEach(async (done) => {
  await clearDb();
  ticket = await fillDb(done);
  done();
});

afterEach(async (done) => {
  await clearDb();
  done();
});

it('ticket board resolver', async () => {
  const board = await resolver.board(ticket);
  expect(board.label).toEqual('Test Board');
});

it('ticket comments resolver', async () => {
  const comments = await resolver.comments(ticket);
  expect(comments).toHaveLength(1);
  expect(comments[0].body).toEqual('Test Comment');
});

it('ticket history resolver', async () => {
  const history = await resolver.history(ticket);
  expect(history).toHaveLength(1);
  expect(history[0].itemType).toEqual('comment');
});
