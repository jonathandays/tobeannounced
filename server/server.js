var express = require('express');
app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var question_pool = [{
    prompt: 'The Puerto Rican tody differs from the other Greater Antilles todies in that it is the only species without _ or _ colored feathers on its flanks.',
    options: ['Pink or Yellow-Green', 'Black or Green', 'White or Purple', 'Baby Blue or Red'],
    correct_answer: 0,
    answers: []
},
{
    prompt: 'The Scientific Name of the Common Coqui',
    options: ['Eleutherodactylus Portorricensis', 'Isolobodon portoricensis', 'Alsophis portoricensis', 'Melanerpes portoricensis'],
    correct_answer: 0,
    answers: []
},
{
    prompt: 'A snail can sleep for _.',
    options: ['Seven  Years', 'Nine  Years', 'Three  Years', 'Eleven  Years'],
    correct_answer: 2,
    answers: []
},
{
    prompt: 'The heart of a shrimp is located in its _.',
    options: ['Torax', 'Head', 'Tail', 'Legs'],
    correct_answer: 1,
    answers: []
},
{
    prompt: 'The fingerprints of a _ are so indistinguishable from humans that they have on occasion been confused at a crime scene.',
    options: ['Lemur', 'Koala', 'Armadilo', 'Kangaru'],
    correct_answer: 1,
    answers: []
},
{
    prompt: 'Nearly three percent of the ice in Antarctic glaciers is?',
    options: ['Bear Sweat', 'Shark Blood', 'Pure Water', 'Penguin Pee'],
    correct_answer: 3,
    answers: []
},
{
    prompt: 'A cow gives nearly _ glasses of milk in a lifetime.',
    options: ['10,000', '30,000', '120,000', '200,000'],
    correct_answer: 3,
    answers: []
},
{
    prompt: 'What is the Function of Caffeine in the Coffee Plant ?',
    options: ['Flavor', 'Color', 'Pesticide', 'Aromitic'],
    correct_answer: 2,
    answers: []
},
 {
    prompt: 'What is the Original Color of Carrots? ',
    options: ["White", "Purple", "Yellow", "Orange" ],
    correct_answer: 1,
    answers: []
},
{
   prompt: 'Sugar is one of the world’s _. The people of New Guinea were most likely the first to domesticate sugar cane around 8000 B.C.',
   options: ["Oldest Ingredient", "Newest Ingredient", "Worst Ingredient", "Bad Ingredient" ],
   correct_answer: 0,
   answers: []
},
{
   prompt: 'The yeast use in baking bread or making beer is classify has a:',
   options: ["Virus", "Bacteria", "Fungus", "Animal" ],
   correct_answer: 2,
   answers: []
},
{
   prompt: 'Everyone has a unique smell, except for _, who smell the same.',
   options: ["Fraternal Twins", "Identical Twins", "Brothers", "Sisters" ],
   correct_answer: 1,
   answers: []
},
{
   prompt: 'The human body is estimated to have 60,000 _ of blood vessels.',
   options: ["centimeters", "nanometers", "yards", "miles" ],
   correct_answer: 3,
   answers: []
},
{
   prompt: 'The most common blood type in the world is Type O. The rarest blood type, _ or Bombay blood, due to the location of its discovery, has been found in less than hundred people since it was discovered.',
   options: ["AB", "A", "X", "A-H" ],
   correct_answer: 3,
   answers: []
},
{
   prompt: 'Humans are the only animals to produce _.',
   options: ["Sweat", "Oxygen", "Emotional Tears", "Hair" ],
   correct_answer: 2,
   answers: []
},
{
   prompt: 'What is the only taste humans are born craving?',
   options: ["Salt", "Vegetables", "Sugar", "Chocolate" ],
   correct_answer: 2,
   answers: []
},
{
   prompt: '8 percent of your DNA is derived from _ that invaded your ancestors.',
   options: ["Vikings", "Viruses", "Romans", "Bacteria" ],
   correct_answer: 1,
   answers: []
},
{
   prompt: 'Some women can have a genetic mutation that makes them tetrachromatic, which causes their eyes to have four different types of cone cells, enabling them to see _ compared to the roughly 1 million colors most of us can see.',
   options: ["20 million", "10 million", "50 million", "100 million" ],
   correct_answer: 3,
   answers: []
},
{
   prompt: 'Compared with other Latino groups sampled, Puerto Ricans have the _ of European genetic ancestry, about 72-75%.',
   options: ["Eurasian", "Indigenous", "African", "Atlantian" ],
   correct_answer: 0,
   answers: []
},
{
   prompt: 'If a human being’s DNA were uncoiled, it would stretch 10 billion miles, from _ and _ back ',
   options: ["Earth to Moon", "Earth to Mars", "Sun to Earth", "Earth to Pluto" ],
   correct_answer: 3,
   answers: []
},
{
   prompt: 'Like Wolverine, the _ is the only organ that can completely regenerate. As little as 25% of the original liver mass can regenerate back to its full size.',
   options: ["Heart", "Liver", "Kidney", "Lungs" ],
   correct_answer: 1,
   answers: []
    }];

var games = [];

server.listen(80);
// WARNING: app.listen(80) will NOT work here!

app.use(express.static('static'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});


function find_current_game(rc){
    var current_game = {}
    games.forEach(game => {
        if (game.room_code == rc) {
            current_game = game;
        }

    });

    return current_game;
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
  }


function emit_all_players(event, data, plyrs){
    plyrs.forEach(player => {
        player.socket.emit(event, data)
    });
}


function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  
    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
  }
  
  console.log(makeid());

io.on('connection', function (socket) {
//   socket.emit('news', { hello: 'world' });
  socket.on('create_game', (data) => {
    
    var questions = [];

    shuffle(question_pool);

    var question_limit = 3; //9;

    for(var i = 0; i < question_limit; i++) {
        questions.push({
            prompt: question_pool[i].prompt,
            correct_answer: question_pool[i].correct_answer,
            answers: [],
            options: question_pool[i].options
        });
    }

    var game = {
        "players": [],
        "game_client": socket,
        "questions": questions,
        "question_index": 0,
        "difficulty": data.difficulty,
        "category": data.category,
        "room_code": makeid()
      };


    games.push(game);

    //   console.log(games);

    payload = {
        room_code : game.room_code,
        questions : game.questions
    }

    socket.emit('game_created', payload);
  
    
  });

  socket.on('player_join', (data) => {
        var player = {
            'name': data.name,
            'id': socket.id,
            'socket': socket,
            'points': 0
        }
        console.log(player)

        var current_game = find_current_game(data.room_code.toUpperCase());

        // console.log(current_game);
        if (!current_game.room_code){
            socket.emit('player_join_response', {'message': 'game not found!'});
        }
        else {
            current_game.players.push(player)
            socket.emit('player_join_response', {message: 'player joined', id: player.id, player_name: player.name, player_count: current_game.players.length})
            current_game.game_client.emit('player_join_response', {message: 'player joined', id: player.id, player_name: player.name, player_count: current_game.players.length})
        }
  });

  socket.on('start_game', (data) => {
    
    var current_game = find_current_game(data.room_code.toUpperCase());

    emit_all_players('game_started', {message: 'The game has begun!'}, current_game.players);

  });

  socket.on('question_started', (data) => {
    
    var current_game = find_current_game(data.room_code.toUpperCase());

    current_game.question_index = data.index;
    var payload = current_game.questions[data.index]
    emit_all_players('question_started', payload, current_game.players)

  });

  socket.on('question_answer', (data) => {
        
    var current_game = find_current_game(data.room_code.toUpperCase());

    var answer = {
        player_id: data.player_id,
        selected_option: data.index
    }

    current_game.questions[current_game.question_index].answers.push(answer);
    
    current_game.game_client.emit('question_answered', answer);



  });

  socket.on('timeout', (data) => {
    
    var current_game = find_current_game(data.room_code.toUpperCase());

    var payload = {
        message: "Time is up!"
    };

    current_game.game_client.emit('answers', current_game.questions[current_game.question_index].answers);
    
    emit_all_players('timeout', payload, current_game.players);


  });

  socket.on('end_game', (data) => {
    
    console.log('123PESCAO')

    var current_game = find_current_game(data.room_code.toUpperCase());
    console.log(current_game)

    var payload = {
        message: "The game ended!"
    };

    //current_game.game_client.emit('end_game', current_game.answers);
    
    emit_all_players('end_game', payload, current_game.players);

    //Remove game from list of games
    var index = games.indexOf(current_game)
    games.splice(index, 1);
    console.log(games)
  });

});