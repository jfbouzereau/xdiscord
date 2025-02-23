## Introduction
This command line utility allows you to export discord data. It saves messages of channels, categories or entire guilds as html pages.

## Installation
Download the directory from github. Then

```
cd xdiscord

# fetch dependencies
npm install
```

## Configuration
You need to get your discord user token 

* Launch discord in the web browser (https://discord.com)
* Log in
* Open the developer tools
* Select the storage tab
* Select local storage
* Find the TOKEN line
* Edit the start script in package.json

## Execution
```
npm start
```

The first screen lists all the guilds you have access to.  
You can navigate through the list with the arrow keys or with the VI keys (j=down,k=up)  
Press x to export the entire selected guild.  
Press enter to list the categories of the selected guild.  
Press x to export the entire selected category.  
Press enter to list the channels of the selected category.  
Press x to export the selected channel.  
At any moment press escape or backspace to go back to the upper level.  
At any moment press q to quit.  


A channel is exported as the following path:  
guild.id / category.id / channel.id / index.html  


## Requirements

node.js  
curl  






 