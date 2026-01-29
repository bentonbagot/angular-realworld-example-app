import { Injectable, signal, computed, inject } from "@angular/core";
import { Observable } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";

import { JwtService } from "./jwt.service";
import { tap, shareReplay, map, distinctUntilChanged } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import { User } from "../user.model";
import { Router } from "@angular/router";

@Injectable({ providedIn: "root" })
export class UserService {
  public currentUserSignal = signal<User | null>(null);

  public isAuthenticated = computed(() => !!this.currentUserSignal());

  // Observable versions for backward compatibility with existing components
  public currentUser = toObservable(this.currentUserSignal).pipe(
    distinctUntilChanged(),
  );
  public isAuthenticated$ = this.currentUser.pipe(map((user) => !!user));

  constructor(
    private readonly http: HttpClient,
    private readonly jwtService: JwtService,
    private readonly router: Router,
  ) {}

  login(credentials: {
    email: string;
    password: string;
  }): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>("/users/login", { user: credentials })
      .pipe(tap(({ user }) => this.setAuth(user)));
  }

  register(credentials: {
    username: string;
    email: string;
    password: string;
  }): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>("/users", { user: credentials })
      .pipe(tap(({ user }) => this.setAuth(user)));
  }

  logout(): void {
    this.purgeAuth();
    void this.router.navigate(["/"]);
  }

  getCurrentUser(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>("/user").pipe(
      tap({
        next: ({ user }) => this.setAuth(user),
        error: () => this.purgeAuth(),
      }),
      shareReplay(1),
    );
  }

  update(user: Partial<User>): Observable<{ user: User }> {
    return this.http.put<{ user: User }>("/user", { user }).pipe(
      tap(({ user }) => {
        this.currentUserSignal.set(user);
      }),
    );
  }

  setAuth(user: User): void {
    this.jwtService.saveToken(user.token);
    this.currentUserSignal.set(user);
  }

  purgeAuth(): void {
    this.jwtService.destroyToken();
    this.currentUserSignal.set(null);
  }
}
