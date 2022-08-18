# unraveler
Discord bot that pipes individual user voice streams to separate mixer channels.

Very, very proof-of-concept at the moment.

## Usage
Clone this, run `yarn` to install dependences. Run `yarn setup` once after you create your Discord app. Start the bot with `yarn start`.

Once the bot is in your server, join the text chat for a voice channel (_you have to enable this sorry_) and type `/join`.

## Commands

`/join` - Join the attached voice channel.

`/leave` - Leave the voice channel.

`/flush` - Unmap all the users from their audio channels.

## Config
Make a file called `config.json` in the root directory

```
{
  "asioDevice": "",
  "startChannel": 3,
  "numChannels": 4,
  "discordToken": "",
  "userIgnoreList": []
}
```

`asioDevice` - The name of the ASIO device (you can run `yarn dependency-report` to get a full list).

`startChannel` - The lowest channel to map to Discord audio.

`numChannel` - The number of available Discord slots to map to channels.

`discordToken` - The token for the Discord bot.

`userIgnoreList` - A list of user IDs that will never be mapped (useful for stream tech users).

## Discord Bot Setup

Scopes: `bot`, `applications.commands`

Bot Permissions: `Read Messages/View Channels`, `Connect`

Run `yarn setup` once after configuring `config.json`.

## Warning!!!

This absolutely does not shut down properly, and I still haven't figured out why. You may need to check your task manager if you're relaunching the bot frequently.
