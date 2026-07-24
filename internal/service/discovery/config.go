package mdns_discovery

import (
	"errors"
	"fmt"

	"github.com/anyshake/observer/config"
	"github.com/anyshake/observer/internal/dao/action"
	"github.com/google/uuid"
)

type discoveryConfigEnabledImpl struct{}

func (s *discoveryConfigEnabledImpl) GetName() string             { return "Enable" }
func (s *discoveryConfigEnabledImpl) GetNamespace() string        { return ID }
func (s *discoveryConfigEnabledImpl) GetKey() string              { return "enabled" }
func (s *discoveryConfigEnabledImpl) GetType() action.SettingType { return action.Bool }
func (s *discoveryConfigEnabledImpl) IsRequired() bool            { return true }
func (s *discoveryConfigEnabledImpl) GetVersion() int             { return 0 }
func (s *discoveryConfigEnabledImpl) GetOptions() map[string]any  { return nil }
func (s *discoveryConfigEnabledImpl) GetDefaultValue() any        { return true }
func (s *discoveryConfigEnabledImpl) GetDescription() string {
	return "Enable mDNS discovery service to make AnyShake Observer discoverable on the local network."
}
func (s *discoveryConfigEnabledImpl) Init(handler *action.Handler) error {
	if _, err := handler.SettingsInit(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to set default mDNS discovery service availability: %w", err)
	}
	return nil
}
func (s *discoveryConfigEnabledImpl) Set(handler *action.Handler, newVal any) error {
	enabled, err := config.GetConfigValBool(newVal)
	if err != nil {
		return err
	}
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), enabled); err != nil {
		return fmt.Errorf("failed to set mDNS discovery service availability: %w", err)
	}
	return nil
}
func (s *discoveryConfigEnabledImpl) Get(handler *action.Handler) (any, error) {
	val, _, _, err := handler.SettingsGet(s.GetNamespace(), s.GetKey())
	if err != nil {
		return nil, fmt.Errorf("failed to get mDNS discovery service availability: %w", err)
	}
	enabled, ok := val.(bool)
	if !ok {
		return nil, errors.New("boolean expected")
	}
	return enabled, nil
}
func (s *discoveryConfigEnabledImpl) Restore(handler *action.Handler) error {
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to reset mDNS discovery service availability: %w", err)
	}
	return nil
}

type discoveryConfigInstanceNameImpl struct{}

func (s *discoveryConfigInstanceNameImpl) GetName() string             { return "Instance Name" }
func (s *discoveryConfigInstanceNameImpl) GetNamespace() string        { return ID }
func (s *discoveryConfigInstanceNameImpl) GetKey() string              { return "instance_name" }
func (s *discoveryConfigInstanceNameImpl) GetType() action.SettingType { return action.String }
func (s *discoveryConfigInstanceNameImpl) IsRequired() bool            { return true }
func (s *discoveryConfigInstanceNameImpl) GetVersion() int             { return 0 }
func (s *discoveryConfigInstanceNameImpl) GetOptions() map[string]any  { return nil }
func (s *discoveryConfigInstanceNameImpl) GetDefaultValue() any {
	id := uuid.New().String()
	return fmt.Sprintf("anyshake-observer-%s", id[:8])
}
func (s *discoveryConfigInstanceNameImpl) GetDescription() string {
	return "An unique name to identify this AnyShake Observer instance on the local network."
}
func (s *discoveryConfigInstanceNameImpl) Init(handler *action.Handler) error {
	if _, err := handler.SettingsInit(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to set default mDNS discovery service instance name: %w", err)
	}
	return nil
}
func (s *discoveryConfigInstanceNameImpl) Set(handler *action.Handler, newVal any) error {
	host, err := config.GetConfigValString(newVal)
	if err != nil {
		return err
	}
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), host); err != nil {
		return fmt.Errorf("failed to set mDNS discovery service instance name: %w", err)
	}
	return nil
}
func (s *discoveryConfigInstanceNameImpl) Get(handler *action.Handler) (any, error) {
	val, _, _, err := handler.SettingsGet(s.GetNamespace(), s.GetKey())
	if err != nil {
		return nil, fmt.Errorf("failed to get mDNS discovery service instance name: %w", err)
	}
	host, ok := val.(string)
	if !ok {
		return nil, errors.New("string expected")
	}
	return host, nil
}
func (s *discoveryConfigInstanceNameImpl) Restore(handler *action.Handler) error {
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to reset mDNS discovery service instance name: %w", err)
	}
	return nil
}

type discoveryConfigRegisterSeedLinkImpl struct{}

func (s *discoveryConfigRegisterSeedLinkImpl) GetName() string             { return "Register SeedLink" }
func (s *discoveryConfigRegisterSeedLinkImpl) GetNamespace() string        { return ID }
func (s *discoveryConfigRegisterSeedLinkImpl) GetKey() string              { return "register_seedlink" }
func (s *discoveryConfigRegisterSeedLinkImpl) GetType() action.SettingType { return action.Bool }
func (s *discoveryConfigRegisterSeedLinkImpl) IsRequired() bool            { return true }
func (s *discoveryConfigRegisterSeedLinkImpl) GetVersion() int             { return 0 }
func (s *discoveryConfigRegisterSeedLinkImpl) GetOptions() map[string]any  { return nil }
func (s *discoveryConfigRegisterSeedLinkImpl) GetDefaultValue() any        { return true }
func (s *discoveryConfigRegisterSeedLinkImpl) GetDescription() string {
	return "Broadcast the SeedLink service port via mDNS so clients on the local network can discover and connect to it."
}
func (s *discoveryConfigRegisterSeedLinkImpl) Init(handler *action.Handler) error {
	if _, err := handler.SettingsInit(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to set default SeedLink service flag: %w", err)
	}
	return nil
}
func (s *discoveryConfigRegisterSeedLinkImpl) Set(handler *action.Handler, newVal any) error {
	enabled, err := config.GetConfigValBool(newVal)
	if err != nil {
		return err
	}
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), enabled); err != nil {
		return fmt.Errorf("failed to set SeedLink service flag: %w", err)
	}
	return nil
}
func (s *discoveryConfigRegisterSeedLinkImpl) Get(handler *action.Handler) (any, error) {
	val, _, _, err := handler.SettingsGet(s.GetNamespace(), s.GetKey())
	if err != nil {
		return nil, fmt.Errorf("failed to get SeedLink service flag: %w", err)
	}
	enabled, ok := val.(bool)
	if !ok {
		return nil, errors.New("boolean expected")
	}
	return enabled, nil
}
func (s *discoveryConfigRegisterSeedLinkImpl) Restore(handler *action.Handler) error {
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to reset SeedLink service flag: %w", err)
	}
	return nil
}

type discoveryConfigRegisterWinstonImpl struct{}

func (s *discoveryConfigRegisterWinstonImpl) GetName() string             { return "Register Winston" }
func (s *discoveryConfigRegisterWinstonImpl) GetNamespace() string        { return ID }
func (s *discoveryConfigRegisterWinstonImpl) GetKey() string              { return "register_winston" }
func (s *discoveryConfigRegisterWinstonImpl) GetType() action.SettingType { return action.Bool }
func (s *discoveryConfigRegisterWinstonImpl) IsRequired() bool            { return true }
func (s *discoveryConfigRegisterWinstonImpl) GetVersion() int             { return 0 }
func (s *discoveryConfigRegisterWinstonImpl) GetOptions() map[string]any  { return nil }
func (s *discoveryConfigRegisterWinstonImpl) GetDefaultValue() any        { return true }
func (s *discoveryConfigRegisterWinstonImpl) GetDescription() string {
	return "Broadcast the Winston Wave Server port via mDNS so clients on the local network can discover and connect to it."
}
func (s *discoveryConfigRegisterWinstonImpl) Init(handler *action.Handler) error {
	if _, err := handler.SettingsInit(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to set default Winston service flag: %w", err)
	}
	return nil
}
func (s *discoveryConfigRegisterWinstonImpl) Set(handler *action.Handler, newVal any) error {
	enabled, err := config.GetConfigValBool(newVal)
	if err != nil {
		return err
	}
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), enabled); err != nil {
		return fmt.Errorf("failed to set Winston service flag: %w", err)
	}
	return nil
}
func (s *discoveryConfigRegisterWinstonImpl) Get(handler *action.Handler) (any, error) {
	val, _, _, err := handler.SettingsGet(s.GetNamespace(), s.GetKey())
	if err != nil {
		return nil, fmt.Errorf("failed to get Winston service flag: %w", err)
	}
	enabled, ok := val.(bool)
	if !ok {
		return nil, errors.New("boolean expected")
	}
	return enabled, nil
}
func (s *discoveryConfigRegisterWinstonImpl) Restore(handler *action.Handler) error {
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to reset Winston service flag: %w", err)
	}
	return nil
}

type discoveryConfigRegisterForwarderImpl struct{}

func (s *discoveryConfigRegisterForwarderImpl) GetName() string             { return "Register TCP Forwarder" }
func (s *discoveryConfigRegisterForwarderImpl) GetNamespace() string        { return ID }
func (s *discoveryConfigRegisterForwarderImpl) GetKey() string              { return "register_forwarder" }
func (s *discoveryConfigRegisterForwarderImpl) GetType() action.SettingType { return action.Bool }
func (s *discoveryConfigRegisterForwarderImpl) IsRequired() bool            { return true }
func (s *discoveryConfigRegisterForwarderImpl) GetVersion() int             { return 0 }
func (s *discoveryConfigRegisterForwarderImpl) GetOptions() map[string]any  { return nil }
func (s *discoveryConfigRegisterForwarderImpl) GetDefaultValue() any        { return true }
func (s *discoveryConfigRegisterForwarderImpl) GetDescription() string {
	return "Broadcast the TCP forwarder port via mDNS so clients on the local network can discover and connect to it."
}
func (s *discoveryConfigRegisterForwarderImpl) Init(handler *action.Handler) error {
	if _, err := handler.SettingsInit(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to set default TCP forwarder service flag: %w", err)
	}
	return nil
}
func (s *discoveryConfigRegisterForwarderImpl) Set(handler *action.Handler, newVal any) error {
	enabled, err := config.GetConfigValBool(newVal)
	if err != nil {
		return err
	}
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), enabled); err != nil {
		return fmt.Errorf("failed to set TCP forwarder service flag: %w", err)
	}
	return nil
}
func (s *discoveryConfigRegisterForwarderImpl) Get(handler *action.Handler) (any, error) {
	val, _, _, err := handler.SettingsGet(s.GetNamespace(), s.GetKey())
	if err != nil {
		return nil, fmt.Errorf("failed to get TCP forwarder service flag: %w", err)
	}
	enabled, ok := val.(bool)
	if !ok {
		return nil, errors.New("boolean expected")
	}
	return enabled, nil
}
func (s *discoveryConfigRegisterForwarderImpl) Restore(handler *action.Handler) error {
	if err := handler.SettingsSet(s.GetNamespace(), s.GetKey(), s.GetType(), s.GetVersion(), s.GetDefaultValue()); err != nil {
		return fmt.Errorf("failed to reset TCP forwarder service flag: %w", err)
	}
	return nil
}

func (s *DiscoveryServiceImpl) GetConfigConstraint() []config.IConstraint {
	return []config.IConstraint{
		&discoveryConfigEnabledImpl{},
		&discoveryConfigInstanceNameImpl{},
		&discoveryConfigRegisterSeedLinkImpl{},
		&discoveryConfigRegisterWinstonImpl{},
		&discoveryConfigRegisterForwarderImpl{},
	}
}
