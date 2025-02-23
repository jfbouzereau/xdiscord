#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const spawn = require("child_process").spawnSync;
const blessed = require("blessed");
const screen = blessed.screen({});

const TOKEN = process.env.TOKEN;
const URL = "https://discord.com/api/v9/";
const CDN = "https://cdn.discordapp.com/";

var guilds = null;
var entries = null;
var categories = null;
var channels = null;
var messages = null;
var authors = {};

// current selection
var user=null, guild=null, category=null, channel=null;

// interface
var table=null,infobox=null;

/****************************************************************************/

build_interface();

var user = get_me();

guilds = get_guilds();
guilds.sort(compare);
show_guilds();

/****************************************************************************/

function build_interface() {

	table = blessed.listtable({
	  //parent: screen,
	  data: null,
	  border: 'line',
	  height: '100%',
	  width: '100%',
	  align: 'center',
	  tags: true,
	  keys: true,
	  vi: true,
	  mouse: true,
	  style: {
		border: {
		  fg: 'black'
		},
		header: {
		  fg: 'white',
		  bg: 'blue',
		  bold: true
		},
		cell: {
		  fg: 'black',
		  selected: {
			fg: 'blue',
			bg: 'white',
		  }
		}
	  }
});


	screen.append(table);

	table.on("select",select);
	screen.key('x',function() { do_export(table.selected) });
	screen.key('d',function() { do_dump(table.selected); });
	screen.key('q',function() { screen.destroy() });
	screen.key(['backspace','escape'],back);

	table.focus();

}

/****************************************************************************/

function get_me() {
	return get("users/@me");
}

function get_guilds() {
	return get("users/@me/guilds");
}

function get_entries() {
	return get("guilds/"+guild.id+"/channels");
}

function get_categories() {
	return entries.filter(c=>c.type==4);
}

function get_channels() {
	return entries.filter(c=>c.parent_id==category.id);
}

function get_messages(last) {

	var messages = [];

	var last = null;

	while(1) {
		if(last)
			cmd="channels/"+channel.id+"/messages?before="+last+"&limit=100";
		else
			cmd="channels/"+channel.id+"/messages?limit=100";
		mm = get(cmd);
		if(!mm) break;
		if(!mm[0]) break;
		messages.push(...mm);
		last = mm[mm.length-1].id;
	}

	return messages;
		
}

function get(req) {
	var p = spawn("curl",["-L","-H","Authorization: "+TOKEN,URL+req]);
	return JSON.parse(p.stdout.toString());
}

function get_avatar(uid,aid) {
	var url= "https://cdn.discordapp.com/avatars/"+uid+"/"+aid+".png";
	var p = spawn("curl",["-L",url]);
	return p.stdout;
}

function get_attachment(url) {
	var p = spawn("curl",["-L",url],{maxBuffer:1024*1024*1024});
	return p.stdout;
}

/****************************************************************************/

function compare(a,b) {
	a = a.name.toLowerCase();
	b = b.name.toLowerCase();
	return a<b?-1:a>b?1:0;	
}

/****************************************************************************/

function select(target,index) {

	if(channel!=null) {
	}
	else if(category!=null) {
	}
	else if(guild!=null) {
		category = categories[index-1];
		channels = get_channels();
		channels.sort(compare);
		show_channels();		
	}
	else {
		guild = guilds[index-1];
		entries = get_entries();
		entries.sort(compare);
		categories = get_categories();
		show_categories();
	}

}
	

function back() {

	if(channel!=null) {
	}
	else if(category!=null) {
		category = null;
		show_categories();
	}
	else if(guild!=null) {
		guild= null;
		show_guilds();
	}
}

/****************************************************************************/

function show_guilds() {

	var list = [];

	list.push([user.global_name]);
	for(var g of guilds)
		list.push([g.name]);

	table.setData(list);
	screen.render();
}

function show_categories() {

	var list = [];
	list.push([guild.name]);

	for(var c of categories) 
		list.push([c.name+" /"]);

	table.setData(list);
	screen.render();	
}

function show_channels() {

	var list = [];

	list.push([category.name]);

	for(var c of channels) {
		if(c.parent_id==category.id)
			list.push([c.name]);
	}

	table.setData(list);
	screen.render();	
}


/****************************************************************************/

function export_guild(cb) {

	entries = get_entries();
	entries.sort(compare);
	categories = get_categories();


	content = head(guild.name);
	content += "<body>\n<ul>\n";

	for(var i=0;i<categories.length;i++) {
		var c = categories[i];
		content += `<li><a href="${c.id}/index.html">${c.name}</li>\n`;
	}

	content += "</ul>\n</body>\n</html>\n";

	var dir;

	dir = guild.id;
	mkdir(dir);

	var filename = path.join(dir,"index.html");
	fs.writeFileSync(filename,content,"utf8");


	index = -1;
	run();

	function run() {
		index++;
		if(index>=categories.length) { category = null; return cb(); }
		category = categories[index];
		export_category(run);
	}

}

/****************************************************************************/

function export_category(cb) {

	channels = get_channels();


	content = head(category.name);
	content += "<body>\n<ul>\n";

	for(var i=0;i<channels.length;i++) {
		var c = channels[i];
		content += `<li><a href="${c.id}/index.html">${c.name}</li>\n`;
	}
	content += "</ul>\n</body>\n</html>\n";
	
	var dir;

	dir = guild.id;
	mkdir(dir);

	dir = path.join(dir,category.id);
	mkdir(dir);

	var filename = path.join(dir,"index.html");
	fs.writeFileSync(filename,content,"utf8");



	var index = -1;
	run();

	function run() {
		index++;
		if(index>=channels.length) { channel=null; return cb(); }
		channel = channels[index];
		export_channel(run);
	}

}

/****************************************************************************/

function export_channel(cb) {

	if(!infobox) show_infobox();
	set_infobox("{bold}Exporting{/bold}\n"+
		guild.name+"\n"+category.name+"\n"+channel.name);

	// give time to update the screen
	setTimeout(export1,100);	

	function export1() {

	var dir;

	dir = guild.id;
	mkdir(dir);

	dir = path.join(dir,category.id);
	mkdir(dir);
		
	dir = path.join(dir,channel.id);
	mkdir(dir);


	messages = get_messages();

	// get and save all attachments
	for(var m of messages) {
		var att = m.attachments;
		if(!att) continue;
		if(!att[0]) continue;
		var data = get_attachment(att[0].url);
		var ext = att[0]["content_type"].replace(/.*\//,"");
		fs.writeFileSync(path.join(dir,att[0].id+"."+ext),data);
	}

	// get all authors
	for(var m of messages) {
		var aid = m.author.id;
		if(authors[aid]) continue;
		authors[aid] = m.author;
	}

	// get and save all avatars
	for(var aid in authors) {
		var vid = authors[aid].avatar;
		var img = get_avatar(aid,vid);
		fs.writeFileSync(path.join(dir,vid+".png"),img);
	}


	content = head(channel.name);

	content += `
		<body>
		<table>
		`;


	var last_author = null;
	var last_time = 0;

	for(var i=messages.length-1;i>=0;i--) {
		var m = messages[i];
		content += "<tr>";

		var date = new Date(m.timestamp);
		var aid = m.author.avatar;	

		if(aid==last_author)
			content += `<td width="80" class="left"></td>`;
		else
			content += `<td width="80" class="left"><img src="${aid}.png" class="avatar"/></td>`;

		content += '<td>';

		if(date.getTime()-last_time>60000) {	
			content += `
					<span class="noto bold">${m.author.username}</span>
					<span class="noto small">${date.toLocaleString()}</span>
					<br>`;	
		}

		last_author = aid;
		last_time = date.getTime();

		var att = m.attachments;
		if(att && att[0]) {
			var ext = att[0]["content_type"].replace(/.*\//,"");
			if(att[0]["content_type"].indexOf("image/")==0) {

				var scale = 1.0;
				if(att[0].width>500) scale = 500/att[0].width;
				if(att[0].height*scale>350) scale= 350/(att[0].height*scale)*scale;
				var w = (att[0].width*scale)|0;
				var h = (att[0].height*scale)|0;

				content += `<img src="${att[0].id}.${ext}" width="${w}" height="${h}"/>`;
				}
			else {
				content += `<a href="${att[0].id}.${ext}">${att[0].filename}</a>`;
				}
			}	
		else
			content += `<div class="noto">${f(m.content)}</div>`;

		content += `</td>
			</tr>
		`;
	}

content += `
</table>
</body>
</html>
`;


	var filename = path.join(dir,"/index.html");

	fs.writeFileSync(filename,content,"utf-8");

	if(cb) cb();

	}	// end of export1


	function f(t) {
		t = t.replace(/\n/g,"<br>");
		while(1) {	
			var m = t.match(/\[([^\]]+)\]\(([^\)]+)\)/);
			if(!m) break;
			t = t.replace(m[0],`<a href="${m[2]}">${m[1]}</a>`);
		}
		return t;
	}


}

/****************************************************************************/

function do_export(index) {


	if(channel!=null) {
	}
	else if(category!=null) {
		channel = channels[index-1];
		export_channel(function() { channel=null; hide_infobox(); })
	}
	else if(guild!=null) {
		category = categories[index-1];
		export_category(function() { category=null; hide_infobox(); })
	}
	else {
		guild = guilds[index-1];
		export_guild(function() { guild=null; hide_infobox(); })
	}

}

/****************************************************************************/

function do_dump(index) {

	if(category!=null) {
		channel = channels[index-1];
		var messages = get_messages();

		var filename = channel.id+".json";
		var content = JSON.stringify(messages,null,"\t");
		fs.writeFileSync(filename,content,"utf8");

		channel = null;
	}
	else if(guild!=null) {
		category = categories[index-1];
		entries = get_entries();
	
		var filename = category.id+".json";
		var content = JSON.stringify(entries,null,"\t");
		fs.writeFileSync(filename,content,"utf8");
	
		category = null;
	}
	else {
		var filename = user.id+".json";
		var content = JSON.stringify(guilds,null,"\t");
		fs.writeFileSync(filename,content,"utf8");
	}
}

/****************************************************************************/

function mkdir(dir) {

	try {
		var stat = fs.statSync(dir);
		if(stat.isDirectory()) return;
		console.error("FILE "+dir+" EXISTS");
		process.exit(1);
		}
	catch(err) {
	}	

	fs.mkdirSync(dir);
}


/****************************************************************************/

function show_infobox() {

	infobox = blessed.box({
	  top: 'center',
	  left: 'center',
	  width: '80%',
	  height: 6,
	  align: 'center',
	  content: '',
	  tags: true,
	  border: {
		type: 'line'
	  },
	  style: {
		fg: 'black',
		border: {
		  fg: 'black',
		  bold:true
		}
	  }
	});

	screen.append(infobox);

}

function set_infobox(text) {
	infobox.setContent(text);
	screen.render();
}

function hide_infobox() {
	screen.remove(infobox);
	infobox = null;
	screen.render();
}

/****************************************************************************/

function head(title) {

	return `<!DOCTYPE html>
<html>
<head>
<meta charset='UTF-8'>
<meta name="title" content="${title}">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans&display=swap');
body {
	background-color:#313238;
	color:white;
}
.noto {
  font-family: "Noto Sans", serif;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
  font-variation-settings:
    "wdth" 100;
  font-size:14px;
}
.bold {	
  font-weight:bold;
  color:#5296D6;
}
.small {
  font-size:11px;
  color:#838991;
}
.left {
	vertical-align:top;
}
.avatar {
	width:40px;
	height:40px;
	border-radius:20px;
}
a:link,a:visited,a:hover,a:active {
	color:#4CA7F5;
}
</style>
<title>${title}</title>
</head>
`;
}

/****************************************************************************/
