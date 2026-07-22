package apierr

import (
	"errors"
	"fmt"
)

// Error is a transport-neutral application failure. HTTP handlers translate it to the frozen
// error envelope; services never depend on the HTTP package.
type Error struct {
	Status  int
	Code    string
	Message string
}

func (err *Error) Error() string {
	return fmt.Sprintf("%s: %s", err.Code, err.Message)
}

func New(status int, code, message string) error {
	return &Error{Status: status, Code: code, Message: message}
}

func As(err error) (*Error, bool) {
	var target *Error
	return target, errors.As(err, &target)
}
