// ==============================================================================
// Copyright (C) 2019 - Philip Paquette, Steven Bocco
//
//  This program is free software: you can redistribute it and/or modify it under
//  the terms of the GNU Affero General Public License as published by the Free
//  Software Foundation, either version 3 of the License, or (at your option) any
//  later version.
//
//  This program is distributed in the hope that it will be useful, but WITHOUT
//  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
//  FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
//  details.
//
//  You should have received a copy of the GNU Affero General Public License along
//  with this program.  If not, see <https://www.gnu.org/licenses/>.
// ==============================================================================
import React from 'react';
import {Content} from "../../core/content";
import {Connection} from "../../../diplomacy/client/connection";
import {ConnectionForm} from "../forms/connection_form";
import {DipStorage} from "../utils/dipStorage";

export class ContentConnection extends Content {
    constructor(props) {
        super(props);
        this.connection = null;
        this.onSubmit = this.onSubmit.bind(this);
    }

    static builder(page, data) {
        return {
            title: 'Connection',
            navigation: [],
            component: <ContentConnection page={page} data={data}/>
        };
    }

    onSubmit(data) {
        const page = this.getPage();
        for (let fieldName of ['hostname', 'port', 'username', 'password', 'showServerFields'])
            if (!data.hasOwnProperty(fieldName))
                return page.error(`Missing ${fieldName}, got ${JSON.stringify(data)}`);
        page.info('Connecting ...');
        if (this.connection) {
            this.connection.currentConnectionProcessing.stop();
        }
        this.connection = new Connection(data.hostname, data.port, window.location.protocol.toLowerCase() === 'https:');
        // Page is passed as logger object (with methods info(), error(), success()) when connecting.
        this.connection.connect(this.getPage())
            .then(() => {
                page.connection = this.connection;
                this.connection = null;
                page.success(`Successfully connected to server ${data.username}:${data.port}`);
                page.connection.authenticate(data.username, data.password, false)
                    .catch((error) => {
                        page.error(`Unable to sign in, trying to create an account, error: ${error}`);
                        return page.connection.authenticate(data.username, data.password, true);
                    })
                    .then((channel) => {
                        page.channel = channel;
                        return channel.getAvailableMaps();
                    })
                    .then(availableMaps => {
                        page.availableMaps = availableMaps;
                        const userGameIndices = DipStorage.getUserGames(page.channel.username);
                        if (userGameIndices && userGameIndices.length) {
                            return page.channel.getGamesInfo({games: userGameIndices});
                        } else {
                            return null;
                        }
                    })
                    .then((gamesInfo) => {
                        if (gamesInfo) {
                            this.getPage().success('Found ' + gamesInfo.length + ' user games.');
                            this.getPage().updateMyGames(gamesInfo);
                        }
                        page.loadGames(null, {success: `Account ${data.username} connected.`});
                    })
                    .catch((error) => {
                        page.error('Error while authenticating: ' + error + ' Please re-try.');
                    });
            })
            .catch((error) => {
                page.error('Error while connecting: ' + error + ' Please re-try.');
            });
    }

    render() {
        return <main><ConnectionForm onSubmit={this.onSubmit}/></main>;
    }
}