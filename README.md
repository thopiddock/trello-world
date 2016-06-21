# Trello World

[![Github Releases (by Release)](https://img.shields.io/github/downloads/thopiddock/trello-world/v1.0/total.svg)](https://github.com/thopiddock/trello-world/archive/v1.0.zip) [![license](https://img.shields.io/github/license/mashape/apistatus.svg?maxAge=2592000)]() [![Twitter URL](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&maxAge=2592000)](http://twitter.com/frametrapped)

This project is a an effort to provide a small but friendly user interface for adding, editing and removing Webhooks in Trello. It uses npm to install dependencies so run `npm install` to fetch the dependencies.

## Motivation

I created this as we use Webhooks in Trello to synchronise our created cards with other management software like JIRA. having an interface to easily add new Webhooks was essential for making quick modifications to the correct Webhooks, something which is made an inconvenience with having to run REST commands to retrieve and edit the Webhooks as they are currently. 

## Installation

Simply fork the repository to your local development machine and either run the Launch configuration through node.js or add it to your own web server such as IIS or Apache.

## Needed improvements

Currently the UI lets you select a List from those available to create a new Webhook when actions occur in that List. This functionallity needs to be expanded to cover the other types, Cards, Boards, etc.

## Contributors

At the moment I am the only contribuer, you can reach me via github messaging or on my twitter account @FrameTrapped. Feel free to dive into the project and contribute or improve it in any way you can, I'll happily look into pull requests to keep the main branch up to date.

## License

This is a simple project and one that's completely open to improvement or changes by others. 

I made it to be useful on a business level and as a free tool to make developer and development team lives easier. As such I'm releasing it under a MIT License so you can use it for personal or for business use without restriction. It can be found in the LICENSE file in this repository or a copy is available at https://opensource.org/licenses/MIT
