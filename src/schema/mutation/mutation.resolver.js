const mongoose = require('mongoose');
const moment = require('moment');
const pubsub = require('../subscription/pubsub');
const topics = require('../subscription/topics');
const { createToken } = require('../../auth');

const Board = mongoose.model('Board');
const Ticket = mongoose.model('Ticket');
const Comment = mongoose.model('Comment');
const HistoryRecord = mongoose.model('HistoryRecord');
const User = mongoose.model('User');

module.exports = {
  createBoard(_, { label }) {
    const board = new Board({ label });
    return board.save();
  },

  async updateBoard(_, { id, label }, { user }) {
    const boardUpdated = await Board.findOneAndUpdate(
      { _id: id },
      { $set: { label } },
      { new: true },
    );

    pubsub.publish(topics.BOARD_UPDATED, {
      boardUpdated,
      user,
    });

    return boardUpdated;
  },

  removeBoard(_, { id }) {
    return Board.findOneAndUpdate(
      { _id: id },
      { $set: { removed: true } },
      { new: true },
    );
  },

  async createTicket(_, args, { user }) {
    const { ticket: { boardId: board, ...rest } } = args;

    const now = moment().toDate();

    const historyData = {
      dateTime: now,
      item: board,
      itemType: 'board',
    };

    const historyRecord = await HistoryRecord
      .create(historyData);

    const ticketData = Object.assign({}, rest, {
      history: [historyRecord._id],
      created: now,
      board,
    });

    const newTicket = await Ticket.create(ticketData);

    pubsub.publish(topics.TICKET_ADDED, { ticketAdded: newTicket, user });

    return newTicket;
  },

  async moveTicket(_, { id, boardId: board }, { user }) {
    const now = moment().toDate();

    const historyData = {
      dateTime: now,
      item: board,
      itemType: 'board',
    };

    const ticket = await Ticket.findById(id);

    pubsub.publish(topics.TICKET_REMOVED, {
      ticketRemoved: ticket,
      user,
    });

    const historyRecord = await HistoryRecord
      .create(historyData);

    const movedTicket = await Ticket.findOneAndUpdate(
      { _id: id },
      {
        $set: { board },
        $push: { history: historyRecord._id },
      },
      { new: true },
    );

    pubsub.publish(topics.TICKET_ADDED, {
      ticketAdded: movedTicket,
      user,
    });

    return movedTicket;
  },

  async updateTicket(_, { id, ticket }, { user }) {
    const ticketUpdated = await Ticket.findOneAndUpdate(
      { _id: id },
      { $set: ticket },
      { new: true },
    );

    pubsub.publish(topics.TICKET_UPDATED, {
      ticketUpdated,
      user,
    });

    return ticketUpdated;
  },

  async removeTicket(_, { id }, { user }) {
    const ticketRemoved = await Ticket.findOneAndUpdate(
      { _id: id },
      { $set: { removed: true } },
      { new: true },
    );

    pubsub.publish(topics.TICKET_REMOVED, {
      ticketRemoved,
      user,
    });

    return ticketRemoved;
  },

  async commentTicket(_, { ticketId, body }) {
    const now = moment().toDate();

    const ticket = await Ticket.findById(ticketId);
    const comment = await Comment.create({
      ticket: ticketId,
      body,
    });

    const historyData = {
      dateTime: now,
      item: comment._id,
      itemType: 'comment',
    };

    const historyRecord = await HistoryRecord
      .create(historyData);

    ticket.comments.push(comment._id);
    ticket.history.push(historyRecord._id);
    await ticket.save();

    return comment;
  },

  updateComment(_, { id, body }) {
    return Comment.findOneAndUpdate(
      { _id: id },
      { $set: { body } },
      { new: true },
    );
  },

  removeComment(_, { id }) {
    return Comment.findOneAndUpdate(
      { _id: id },
      { $set: { removed: true } },
      { new: true },
    );
  },

  async createUser(parent, { email, password }) {
    const hased = await User.hash(password);
    return User.create({ email, password: hased });
  },

  login(parent, { email, password }) {
    return createToken({ email, password });
  },
};
