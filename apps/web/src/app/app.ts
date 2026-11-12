import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavBar } from './layout/nav-bar/nav-bar';

@Component({
	imports: [NavBar, RouterOutlet],
	selector: 'app-root',
	styleUrl: './app.scss',
	templateUrl: './app.html'
})
export class App {}
